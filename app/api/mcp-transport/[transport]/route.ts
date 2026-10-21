/**
 * The inherited MCP bridge exposes generic GraphQL reads and mutations to an
 * external agent. It remains disabled until the owner approves a narrow tool,
 * data-minimization, audit, and human-confirmation policy.
 */
export async function POST() {
  return Response.json(
    { error: "MCP access is disabled until an owner-approved data and tool policy is in place." },
    { status: 503 },
  );
}
