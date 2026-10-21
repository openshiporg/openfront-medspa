import { GraphQLError, Kind, Source, getNamedType, getOperationAST, isCompositeType, isListType, isNonNullType, parse, valueFromASTUntyped, type DocumentNode, type GraphQLCompositeType, type GraphQLSchema, type SelectionSetNode, type ValueNode } from 'graphql'

// Adapted from Vape's inspectGraphQL and Coffee Shop's analyzeGraphQLRequest.
// Core 6.5.3 itself has no query-depth protection; enforce it at the actual
// Yoga parser/executor for JSON, GET and multipart, without replacing Core.
export const GRAPHQL_MAX_TAKE = 5000
const fail = (message: string): never => { throw new GraphQLError(message, { extensions: { code: 'QUERY_LIMIT', http: { status: 400 } } }) }
export function parseBoundedGraphQL(source: unknown): DocumentNode {
  const query = typeof source === 'string' ? source : source instanceof Source ? source.body : undefined
  if (!query || query.length > 64_000) return fail('Query is missing or too large')
  const document = parse(query, { maxTokens: 10_000 })
  const fragments = new Map(document.definitions.filter(def => def.kind === Kind.FRAGMENT_DEFINITION).map(def => [def.name.value, def]))
  let fields = 0
  const roots: string[] = []
  function literal(node: ValueNode, depth = 0) {
    if (depth > 20) fail('GraphQL input exceeds the supported complexity')
    if (node.kind === Kind.OBJECT) for (const field of node.fields) literal(field.value, depth + 1)
    if (node.kind === Kind.LIST) for (const value of node.values) literal(value, depth + 1)
  }
  function walk(set: SelectionSetNode, depth: number, seen = new Set<string>()) {
    if (depth > 15) fail('Query depth exceeds the supported limit')
    for (const selection of set.selections) {
      if (++fields > 1000) fail('Query complexity exceeds the supported limit')
      if (selection.kind === Kind.FIELD) {
        for (const arg of selection.arguments || []) literal(arg.value)
        if (depth === 1) roots.push(selection.name.value)
        if (selection.selectionSet) walk(selection.selectionSet, depth + 1, seen)
      } else if (selection.kind === Kind.INLINE_FRAGMENT) walk(selection.selectionSet, depth, seen)
      else {
        if (seen.has(selection.name.value)) fail('Cyclic fragments are unsupported')
        const fragment = fragments.get(selection.name.value)
        if (fragment) walk(fragment.selectionSet, depth, new Set([...seen, selection.name.value]))
      }
    }
  }
  for (const def of document.definitions) if (def.kind === Kind.OPERATION_DEFINITION) walk(def.selectionSet, 1)
  const auth = roots.some(name => /^(?:authenticateUserWithPassword|registerCustomer|createInitialUser|createUsers?|sendUserPasswordResetLink|redeemUserPasswordResetToken|validateUserPasswordResetToken|updateActiveUserPassword)$/.test(name))
  if (auth && roots.length !== 1) fail('Authentication requests must contain one operation')
  return document
}

export function assertGraphQLExecutionBudget(schema: GraphQLSchema, document: DocumentNode, variables: Record<string, unknown> = {}, operationName?: string | null) {
  let nodes = 0
  function input(value: unknown, depth = 0) {
    if (depth > 20 || ++nodes > 10_000) fail('GraphQL input exceeds the supported complexity')
    if (!value || typeof value !== 'object') return
    // Upload promises/streams and scalar Date values are opaque leaves, not JSON.
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== null && prototype !== Object.prototype && !Array.isArray(value)) return
    for (const child of Object.values(value)) input(child, depth + 1)
  }
  input(variables)
  const operation = getOperationAST(document, operationName || undefined)
  if (!operation || operation.operation === 'subscription') return fail('Select one supported GraphQL operation')
  const root = operation.operation === 'mutation' ? schema.getMutationType() : schema.getQueryType()
  if (!root) return fail('GraphQL operation type unavailable')
  const fragments = new Map(document.definitions.filter(def => def.kind === Kind.FRAGMENT_DEFINITION).map(def => [def.name.value, def]))
  let cost = 0
  function walk(set: SelectionSetNode, parent: GraphQLCompositeType, multiplier: number, seen = new Set<string>()) {
    for (const selection of set.selections) {
      if (selection.kind === Kind.FIELD) {
        const definition = 'getFields' in parent ? parent.getFields()[selection.name.value] : undefined
        let next = multiplier
        if (definition) {
          for (const arg of selection.arguments || []) {
            const value: unknown = valueFromASTUntyped(arg.value, variables)
            if (arg.name.value === 'take' && value != null && (!Number.isInteger(value) || Math.abs(Number(value)) > GRAPHQL_MAX_TAKE)) fail('GraphQL take exceeds the supported limit')
            if (arg.name.value === 'skip' && (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100_000)) fail('GraphQL skip exceeds the supported limit')
          }
          let type = definition.type
          while (isNonNullType(type)) type = type.ofType
          if (isListType(type)) {
            const take = selection.arguments?.find(arg => arg.name.value === 'take')
            const requested = take ? valueFromASTUntyped(take.value, variables) as unknown : undefined
            // Like the donor, estimate unspecified projections at ten rows;
            // this is a cost heuristic, not a truncation of clinical/financial
            // snapshots. Core separately enforces the actual native page cap.
            next = Math.min(1_000_001, multiplier * (typeof requested === 'number' ? Math.max(1, Math.abs(requested)) : 10))
          }
        }
        cost += next
        if (cost > 1_000_000) fail('GraphQL query cost exceeds the supported limit')
        if (selection.selectionSet && definition) {
          const child = getNamedType(definition.type)
          if (isCompositeType(child)) walk(selection.selectionSet, child, next, seen)
        }
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        const child = selection.typeCondition ? schema.getType(selection.typeCondition.name.value) : parent
        if (child && isCompositeType(child)) walk(selection.selectionSet, child, multiplier, seen)
      } else {
        const name = selection.name.value
        if (seen.has(name)) fail('Cyclic fragments are unsupported')
        const fragment = fragments.get(name), child = fragment && schema.getType(fragment.typeCondition.name.value)
        if (fragment && child && isCompositeType(child)) walk(fragment.selectionSet, child, multiplier, new Set([...seen, name]))
      }
    }
  }
  walk(operation.selectionSet, root, 1)
}
