import { Readable, Transform } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";

export const GRAPHQL_JSON_MAX_REQUEST_BYTES = 1_000_000;
export const GRAPHQL_MULTIPART_MAX_REQUEST_BYTES = 80_000_000;
export const GRAPHQL_MULTIPART_MAX_FILES = 3;
export const GRAPHQL_MULTIPART_MAX_PARTS = 5;
export const GRAPHQL_MULTIPART_MAX_FILE_BYTES = 25_000_000;
export const GRAPHQL_MULTIPART_MAX_FIELD_BYTES = 1_000_000;

export class GraphQLRequestSizeLimitError extends Error {
  readonly status = 413;
  constructor() {
    super("GraphQL request size limit exceeded");
    this.name = "GraphQLRequestSizeLimitError";
  }
}

export class GraphQLRequestPartLimitError extends Error {
  readonly status = 413;
  constructor() {
    super("GraphQL multipart part limit exceeded");
    this.name = "GraphQLRequestPartLimitError";
  }
}

class InvalidGraphQLRequestBodyError extends Error {
  readonly status = 400;
  constructor() {
    super("Invalid GraphQL request body");
    this.name = "InvalidGraphQLRequestBodyError";
  }
}

function multipartBoundary(contentType: string | string[] | undefined): Buffer | null {
  const value = Array.isArray(contentType) ? contentType[0] : contentType;
  const match = value?.match(/(?:^|);\s*boundary\s*=\s*(?:"((?:\\.|[^"])*)"|([^;\s,]+))/i);
  const boundary = match?.[1]?.replace(/\\(.)/g, "$1") ?? match?.[2];
  if (!boundary || boundary.length > 16_384 || /[\r\n]/.test(boundary)) return null;
  return Buffer.from(boundary, "latin1");
}

class MultipartPartCounter {
  private readonly marker: Buffer;
  private readonly maxSequenceLength: number;
  private tail = Buffer.alloc(0);
  private bytesSeen = 0;
  private scannedThrough = 0;
  private partCount = 0;
  private closed = false;

  constructor(boundary: Buffer, private readonly maxParts: number) {
    this.marker = Buffer.concat([Buffer.from("--"), boundary]);
    this.maxSequenceLength = this.marker.length + 4; // optional leading CRLF plus trailing CRLF/--
  }

  push(chunk: Buffer): boolean {
    if (this.closed) {
      this.bytesSeen += chunk.length;
      return true;
    }
    const data = Buffer.concat([this.tail, chunk]);
    const baseOffset = this.bytesSeen - this.tail.length;
    const completeStarts = Math.max(0, data.length - this.maxSequenceLength + 1);
    const startAt = Math.max(0, this.scannedThrough - baseOffset);
    for (let index = startAt; index < completeStarts; index += 1) {
      if (!this.isBoundaryStart(data, index, baseOffset + index)) continue;
      const suffix = index + this.marker.length;
      if (data[suffix] === 13 && data[suffix + 1] === 10) {
        this.partCount += 1;
        if (this.partCount > this.maxParts) return false;
      } else if (data[suffix] === 45 && data[suffix + 1] === 45) {
        this.closed = true;
        break;
      }
    }
    this.scannedThrough = baseOffset + completeStarts;
    this.tail = Buffer.from(data.subarray(Math.max(0, data.length - (this.maxSequenceLength - 1))));
    this.bytesSeen += chunk.length;
    return true;
  }

  finish(): boolean {
    if (this.closed) return true;
    const baseOffset = this.bytesSeen - this.tail.length;
    const startAt = Math.max(0, this.scannedThrough - baseOffset);
    for (let index = startAt; index < this.tail.length; index += 1) {
      if (!this.isBoundaryStart(this.tail, index, baseOffset + index)) continue;
      const suffix = index + this.marker.length;
      if (this.tail[suffix] === 13 && this.tail[suffix + 1] === 10) {
        this.partCount += 1;
        if (this.partCount > this.maxParts) return false;
      } else if (this.tail[suffix] === 45 && this.tail[suffix + 1] === 45) {
        this.closed = true;
        break;
      }
    }
    return true;
  }

  private isBoundaryStart(data: Buffer, index: number, absoluteOffset: number): boolean {
    if (absoluteOffset === 0) return data.subarray(index, index + this.marker.length).equals(this.marker);
    return index >= 2 && data[index - 2] === 13 && data[index - 1] === 10
      && data.subarray(index, index + this.marker.length).equals(this.marker);
  }
}

/** Read a non-multipart body once, retaining no more than the configured byte limit. */
export function readBoundedGraphQLBody(request: IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    const cleanup = () => {
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
      request.off("aborted", onAborted);
      request.off("close", onClose);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onData = (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += bytes.byteLength;
      if (totalBytes > maxBytes) {
        request.pause();
        fail(new GraphQLRequestSizeLimitError());
        return;
      }
      chunks.push(bytes);
    };
    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(Buffer.concat(chunks, totalBytes));
    };
    const onError = () => fail(new InvalidGraphQLRequestBodyError());
    const onAborted = () => fail(new InvalidGraphQLRequestBodyError());
    const onClose = () => {
      if (!request.readableEnded) fail(new InvalidGraphQLRequestBodyError());
    };

    request.on("data", onData);
    request.once("end", onEnd);
    request.once("error", onError);
    request.once("aborted", onAborted);
    request.once("close", onClose);
  });
}

type MultipartProcessRequest = (
  request: IncomingMessage,
  response: ServerResponse,
  options: { maxFiles: number; maxFileSize: number; maxFieldSize: number },
) => Promise<unknown>;

/**
 * Run graphql-upload's pinned parser through a byte/part-counting pass-through.
 * graphql-upload@15.0.2 exposes field/file limits but not Busboy's total-parts
 * limit. The parser resolves operations/map before file streams finish, so wait
 * for the bounded input stream to end before allowing Yoga to execute.
 */
export async function processBoundedGraphQLMultipart(
  request: IncomingMessage,
  response: ServerResponse,
  processRequest: MultipartProcessRequest,
  limits: { maxBytes?: number; maxParts?: number; maxFiles?: number; maxFileSize?: number; maxFieldSize?: number } = {},
): Promise<unknown> {
  const maxBytes = limits.maxBytes ?? GRAPHQL_MULTIPART_MAX_REQUEST_BYTES;
  const maxParts = limits.maxParts ?? GRAPHQL_MULTIPART_MAX_PARTS;
  const maxFiles = limits.maxFiles ?? GRAPHQL_MULTIPART_MAX_FILES;
  const maxFileSize = limits.maxFileSize ?? GRAPHQL_MULTIPART_MAX_FILE_BYTES;
  const maxFieldSize = limits.maxFieldSize ?? GRAPHQL_MULTIPART_MAX_FIELD_BYTES;
  let totalBytes = 0;
  let sizeExceeded = false;
  let partsExceeded = false;
  let fileSizeExceeded = false;
  let uploadStreamFailed = false;
  const boundary = multipartBoundary(request.headers["content-type"]);
  const partCounter = boundary ? new MultipartPartCounter(boundary, maxParts) : null;

  const boundedRequest = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        sizeExceeded = true;
        callback(new GraphQLRequestSizeLimitError());
        return;
      }
      if (partCounter && !partCounter.push(chunk)) {
        partsExceeded = true;
        callback(new GraphQLRequestPartLimitError());
        return;
      }
      callback(null, chunk);
    },
    flush(callback) {
      if (partCounter && !partCounter.finish()) {
        partsExceeded = true;
        callback(new GraphQLRequestPartLimitError());
        return;
      }
      callback();
    },
  }) as Transform & { headers: IncomingMessage["headers"] };
  boundedRequest.headers = request.headers;

  const sourceClosed = () => {
    if (!request.readableEnded && !boundedRequest.destroyed) {
      boundedRequest.destroy(new InvalidGraphQLRequestBodyError());
    }
  };
  request.once("close", sourceClosed);

  const originalPipe = boundedRequest.pipe;
  boundedRequest.pipe = function (destination: NodeJS.WritableStream) {
    const parser = destination as typeof destination & {
      on?: (event: string, listener: (...args: unknown[]) => void) => unknown;
      once?: (event: string, listener: (...args: unknown[]) => void) => unknown;
      destroy?: (error?: Error) => unknown;
    };
    if (parser.on && parser.once && parser.destroy) {
      let parts = 0;
      const countPart = () => {
        parts += 1;
        if (parts > maxParts) {
          partsExceeded = true;
          parser.destroy?.(new GraphQLRequestPartLimitError());
        }
      };
      parser.on("field", countPart);
      parser.on("file", (...args: unknown[]) => {
        countPart();
        const fileStream = args[1] as { once?: (event: string, listener: () => void) => unknown } | undefined;
        fileStream?.once?.("limit", () => { fileSizeExceeded = true; });
        fileStream?.once?.("error", () => { uploadStreamFailed = true; });
      });
      parser.once("fieldsLimit", () => {
        partsExceeded = true;
        parser.destroy?.(new GraphQLRequestPartLimitError());
      });
    }
    return originalPipe.call(boundedRequest, destination);
  } as typeof boundedRequest.pipe;

  const inputComplete = new Promise<void>((resolve, reject) => {
    boundedRequest.once("end", resolve);
    boundedRequest.once("error", reject);
  });
  // graphql-upload consumes only the request's readable stream and headers.
  // The limiter deliberately replaces that stream; it must never see the raw
  // IncomingMessage or bypass our byte/part bounds.
  const parsed = processRequest(boundedRequest as unknown as IncomingMessage, response, { maxFiles, maxFileSize, maxFieldSize });
  boundedRequest.pipe = originalPipe;

  // If parser construction itself fails, keep the limiter draining the input
  // so the completion promise settles without handing malformed data to Yoga.
  void parsed.catch(() => boundedRequest.resume());
  request.pipe(boundedRequest);

  const [parseResult, inputResult] = await Promise.allSettled([parsed, inputComplete]);
  request.off("close", sourceClosed);

  if (sizeExceeded) throw new GraphQLRequestSizeLimitError();
  if (partsExceeded || fileSizeExceeded) throw new GraphQLRequestPartLimitError();
  if (uploadStreamFailed) throw new InvalidGraphQLRequestBodyError();
  if (inputResult.status === "rejected") throw new InvalidGraphQLRequestBodyError();
  if (parseResult.status === "rejected") {
    const status = (parseResult.reason as { status?: unknown } | null)?.status;
    if (status === 413) throw new GraphQLRequestPartLimitError();
    throw new InvalidGraphQLRequestBodyError();
  }

  return parseResult.value;
}

export function parseBufferedGraphQLJson(bytes: Buffer): unknown {
  try {
    const value = JSON.parse(bytes.toString("utf8"));
    if (value === null || typeof value !== "object" || Object.keys(value).length === 0) {
      throw new InvalidGraphQLRequestBodyError();
    }
    return value;
  } catch {
    throw new InvalidGraphQLRequestBodyError();
  }
}

export function replayBufferedGraphQLBody(bytes: Buffer): Readable & { graphqlBoundedBody: true } {
  const stream = Readable.from([bytes]) as Readable & { graphqlBoundedBody: true };
  Object.defineProperty(stream, "graphqlBoundedBody", { value: true, enumerable: true });
  return stream;
}

export function graphQLRequestFailure(error: unknown): { status: 400 | 413; message: string; closeConnection: boolean } {
  const failure = error as { status?: unknown } | null;
  const tooLarge = error instanceof GraphQLRequestSizeLimitError
    || error instanceof GraphQLRequestPartLimitError
    || failure?.status === 413;
  return {
    status: tooLarge ? 413 : 400,
    message: tooLarge ? "GraphQL request exceeds the configured request limits" : "Invalid GraphQL request body",
    closeConnection: error instanceof GraphQLRequestSizeLimitError || error instanceof GraphQLRequestPartLimitError,
  };
}
