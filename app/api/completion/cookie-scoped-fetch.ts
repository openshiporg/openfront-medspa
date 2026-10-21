type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function requestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return new URL(input.url);
  return new URL(input.toString());
}

function mergeCookieHeader(current: string, setCookieHeaders: string[]) {
  const cookies = new Map<string, string>();
  for (const entry of current.split(";")) {
    const cookie = entry.trim();
    const separator = cookie.indexOf("=");
    if (separator > 0) cookies.set(cookie.slice(0, separator), cookie.slice(separator + 1));
  }
  for (const header of setCookieHeaders) {
    const cookie = header.split(";", 1)[0]?.trim();
    const separator = cookie.indexOf("=");
    if (separator > 0) cookies.set(cookie.slice(0, separator), cookie.slice(separator + 1));
  }
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

/**
 * Creates an instance-scoped fetch for one MCP endpoint. Request cookies never
 * touch global.fetch and are stripped from every other URL, including other
 * same-origin paths and external provider requests.
 */
export function createCookieScopedFetch(
  endpoint: URL,
  initialCookie: string,
  fetchImpl: FetchLike = fetch,
): FetchLike {
  let cookie = initialCookie;

  return async (input, init) => {
    const target = requestUrl(input);
    const isMcpEndpoint = target.origin === endpoint.origin && target.pathname === endpoint.pathname;
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, name) => headers.set(name, value));

    if (isMcpEndpoint && cookie) headers.set("cookie", cookie);
    else headers.delete("cookie");

    const response = await fetchImpl(input, { ...init, headers });
    if (isMcpEndpoint) {
      const setCookies = typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : response.headers.get("set-cookie")
          ? [response.headers.get("set-cookie") as string]
          : [];
      if (setCookies.length) cookie = mergeCookieHeader(cookie, setCookies);
    }
    return response;
  };
}
