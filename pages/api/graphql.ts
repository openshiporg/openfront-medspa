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
    graphiql: process.env.NODE_ENV !== "production",
    renderGraphiQL: process.env.NODE_ENV === "production" ? undefined : () => {
      return `
        <!DOCTYPE html>
        <html lang="en">
          <body style="margin: 0; overflow-x: hidden; overflow-y: hidden">
          <div id="sandbox" style="height:100vh; width:100vw;"></div>
          <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
          <script>
          new window.EmbeddedSandbox({
            target: "#sandbox",
            // Pass through your server href if you are embedding on an endpoint.
            // Otherwise, you can pass whatever endpoint you want Sandbox to start up with here.
            initialEndpoint: window.location.href,
            hideCookieToggle: false,
            initialState: {
              includeCookies: true
            }
          });
          // advanced options: https://www.apollographql.com/docs/studio/explorer/sandbox#embedding-sandbox
          </script>
          </body>
        </html>`;
    },
    plugins: [queryBudgetPlugin],
    graphqlEndpoint: "/api/graphql",
    schema: keystoneContext.graphql.schema,
    context: ({ req, res }: { req: any; res: any }) => {
      return keystoneContext.withRequest(req, res);
    },
    multipart: false,
  })(req, res);
}