import { GraphQLClient, type RequestDocument, type Variables } from "graphql-request";
import { cookies } from "next/headers";
import { getServerGraphQLTarget } from "@/features/dashboard/lib/getBaseUrl";

/** Request-scoped client: forward only the Keystone session to the canonical backend origin. */
class MedSpaClient {
  private async getClient(): Promise<GraphQLClient> {
    // Per request: loopback with THIS request's signed end-user identity; public endpoint if PORT is unknown.
    const [{ endpoint, fetch: internalFetch }, cookieStore] = await Promise.all([getServerGraphQLTarget(), cookies()]);
    const sessionToken = cookieStore.get("keystonejs-session")?.value;
    const headers: Record<string, string> = {};
    if (sessionToken) headers.Cookie = `keystonejs-session=${sessionToken}`;
    return new GraphQLClient(endpoint, {
      ...(internalFetch ? { fetch: internalFetch } : {}),
      headers,
      timeout: 10_000,
    });
  }

  async request<T = any, V extends Variables = Variables>(
    document: RequestDocument,
    variables?: V,
    requestHeaders?: HeadersInit,
  ): Promise<T> {
    const client = await this.getClient();
    return client.request(document, variables, requestHeaders);
  }
}

export const medspaClient = new MedSpaClient();
