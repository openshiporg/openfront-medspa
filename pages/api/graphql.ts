import { keystoneContext, ownedLocalRuntimeReady } from '../../features/keystone/context'
import { createYoga, type Plugin } from "graphql-yoga";
import { parseBoundedGraphQL, assertGraphQLExecutionBudget } from "../../features/keystone/security/graphql-budget";
import processRequest from "graphql-upload/processRequest.js";
import { type NextApiRequest, type NextApiResponse } from 'next'
import {
  GRAPHQL_JSON_MAX_REQUEST_BYTES,
  graphQLRequestFailure,
  parseBufferedGraphQLJson,
  processBoundedGraphQLMultipart,
  readBoundedGraphQLBody,
  replayBufferedGraphQLBody,
} from '../../features/keystone/graphqlRequestLimits'

const queryBudgetPlugin: Plugin = {
  onParse({ params, setParsedDocument }) { setParsedDocument(parseBoundedGraphQL(params.source)) },
  onExecute({ args }) { assertGraphQLExecutionBudget(args.schema, args.document, args.variableValues || {}, args.operationName) },
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ownedLocalRuntimeReady
  const contentTypeHeader = req.headers["content-type"];
  const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;
  const isMultipart = /^\s*multipart\/form-data(?:\s*;|$)/i.test(contentType || "");
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      if (isMultipart) {
        req.body = await processBoundedGraphQLMultipart(req, res, processRequest);
      } else {
        const bytes = await readBoundedGraphQLBody(req, GRAPHQL_JSON_MAX_REQUEST_BYTES);
        req.body = /^(?:application\/json|application\/graphql\+json)(?:\s*;|$)/i.test(contentType || "")
          ? parseBufferedGraphQLJson(bytes)
          : replayBufferedGraphQLBody(bytes);
      }
    } catch (error) {
      const failure = graphQLRequestFailure(error);
      if (failure.closeConnection) res.setHeader("Connection", "close");
      return res.status(failure.status).json({ errors: [{ message: failure.message }] });
    }
  }

  return createYoga({
    graphiql: false,
    plugins: [queryBudgetPlugin],
    graphqlEndpoint: "/api/graphql",
    schema: keystoneContext.graphql.schema,
    context: ({ req, res }: { req: any; res: any }) => {
      return keystoneContext.withRequest(req, res);
    },
    multipart: false,
  })(req, res);
}