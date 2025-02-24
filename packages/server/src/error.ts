import { Schema } from "effect";

export const ErrorCode = {
  // SDK error codes
  ConnectionClosed: -32000,
  RequestTimeout: -32001,

  // Standard JSON-RPC error codes
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

export class JsonRpcError extends Schema.TaggedError<JsonRpcError>()(
  "JsonRpcError",
  {
    code: Schema.Number,
    message: Schema.String,
    data: Schema.optional(Schema.Unknown),
  }
) {
  static readonly fromCode = (
    cause: keyof typeof ErrorCode,
    message: string,
    data?: unknown
  ) =>
    new JsonRpcError({
      code: ErrorCode[cause],
      message: message,
      data: data,
    });
}
