export class WebhookBodyTooLarge extends Error {}

/** Preserve exact admitted bytes; count before decoding or allocating a joined body. */
export async function readWebhookBody(request: Request, maxBytes: number): Promise<string> {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new WebhookBodyTooLarge();
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new WebhookBodyTooLarge();
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } finally { reader.releaseLock(); }
}
