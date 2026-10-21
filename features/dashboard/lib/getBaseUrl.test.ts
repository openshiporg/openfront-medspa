import assert from "node:assert/strict";
import test from "node:test";
import { getBaseUrl } from "./getBaseUrl";

const env = process.env as Record<string, string | undefined>;

test("server origin ignores attacker-controlled forwarding headers", async () => {
  const previous = { nodeEnv: env.NODE_ENV, internal: env.MEDSPA_INTERNAL_ORIGIN, public: env.NEXT_PUBLIC_BACKEND_URL, auth: env.NEXTAUTH_URL, port: env.PORT, host: env.HOST, forwarded: env.X_FORWARDED_HOST };
  try {
    env.NODE_ENV = "development";
    delete env.MEDSPA_INTERNAL_ORIGIN;
    delete env.NEXT_PUBLIC_BACKEND_URL;
    delete env.NEXTAUTH_URL;
    env.PORT = "3333";
    env.HOST = "attacker.example";
    env.X_FORWARDED_HOST = "attacker.example";
    assert.equal(await getBaseUrl(), "http://127.0.0.1:3333");
  } finally {
    if (previous.nodeEnv === undefined) delete env.NODE_ENV; else env.NODE_ENV = previous.nodeEnv;
    if (previous.internal === undefined) delete env.MEDSPA_INTERNAL_ORIGIN; else env.MEDSPA_INTERNAL_ORIGIN = previous.internal;
    if (previous.public === undefined) delete env.NEXT_PUBLIC_BACKEND_URL; else env.NEXT_PUBLIC_BACKEND_URL = previous.public;
    if (previous.auth === undefined) delete env.NEXTAUTH_URL; else env.NEXTAUTH_URL = previous.auth;
    if (previous.port === undefined) delete env.PORT; else env.PORT = previous.port;
    if (previous.host === undefined) delete env.HOST; else env.HOST = previous.host;
    if (previous.forwarded === undefined) delete env.X_FORWARDED_HOST; else env.X_FORWARDED_HOST = previous.forwarded;
  }
});

test("production requires an explicit canonical origin and rejects credential-bearing origins", async () => {
  const previous = { nodeEnv: env.NODE_ENV, internal: env.MEDSPA_INTERNAL_ORIGIN, public: env.NEXT_PUBLIC_BACKEND_URL, auth: env.NEXTAUTH_URL, phase: env.NEXT_PHASE };
  try {
    env.NODE_ENV = "production";
    env.NEXT_PHASE = "phase-production-server";
    delete env.MEDSPA_INTERNAL_ORIGIN;
    delete env.NEXT_PUBLIC_BACKEND_URL;
    delete env.NEXTAUTH_URL;
    await assert.rejects(getBaseUrl(), /MEDSPA_INTERNAL_ORIGIN/);
    env.MEDSPA_INTERNAL_ORIGIN = "https://medspa.example/internal/path";
    assert.equal(await getBaseUrl(), "https://medspa.example");
    env.MEDSPA_INTERNAL_ORIGIN = "https://user:secret@medspa.example";
    await assert.rejects(getBaseUrl(), /invalid/);
  } finally {
    if (previous.nodeEnv === undefined) delete env.NODE_ENV; else env.NODE_ENV = previous.nodeEnv;
    if (previous.internal === undefined) delete env.MEDSPA_INTERNAL_ORIGIN; else env.MEDSPA_INTERNAL_ORIGIN = previous.internal;
    if (previous.public === undefined) delete env.NEXT_PUBLIC_BACKEND_URL; else env.NEXT_PUBLIC_BACKEND_URL = previous.public;
    if (previous.auth === undefined) delete env.NEXTAUTH_URL; else env.NEXTAUTH_URL = previous.auth;
    if (previous.phase === undefined) delete env.NEXT_PHASE; else env.NEXT_PHASE = previous.phase;
  }
});
