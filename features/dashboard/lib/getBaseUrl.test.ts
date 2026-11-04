import assert from "node:assert/strict";
import test from "node:test";
import { getBaseUrl, getServerGraphQLTarget } from "./getBaseUrl";

const env = process.env as Record<string, string | undefined>;

async function withPort<T>(port: string | undefined, run: () => Promise<T>): Promise<T> {
  const previous = env.PORT;
  try {
    if (port === undefined) delete env.PORT; else env.PORT = port;
    return await run();
  } finally {
    if (previous === undefined) delete env.PORT; else env.PORT = previous;
  }
}

test("getBaseUrl returns an empty string outside a request (no window, no request headers)", async () => {
  assert.equal(await getBaseUrl(), "");
});

test("getServerGraphQLTarget uses the loopback endpoint with a fetch when the process port is known", async () => {
  await withPort("3333", async () => {
    const target = await getServerGraphQLTarget({ get: () => null });
    assert.equal(target.endpoint, "http://127.0.0.1:3333/api/graphql");
    assert.equal(typeof target.fetch, "function");
  });
});

test("getServerGraphQLTarget falls back to the relative public endpoint without a loopback port", async () => {
  await withPort(undefined, async () => {
    const target = await getServerGraphQLTarget({ get: () => null });
    assert.deepEqual(target, { endpoint: "/api/graphql" });
    assert.equal(target.fetch, undefined);
  });
});
