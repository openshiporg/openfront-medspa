import { graphql } from "@keystone-6/core"
import { checkAvailability } from "./checkAvailability"
import { calculateCommission } from "./calculateCommission"

// Combine all custom GraphQL extensions
export const extendGraphqlSchema = graphql.extend((base) => ({
  query: {
    checkAvailability,
    calculateCommission,
  },
}))
