import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Match from "effect/Match";
import { MCP } from "../mcp/mcp.js";
import type {
  JSONRPCError,
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from "../schema.js";

export const handleMessage = (message: JSONRPCMessage) =>
  pipe(
    MCP,
    Effect.flatMap((mcp) =>
      Match.value(message).pipe(
        Match.when(
          (message): message is JSONRPCError =>
            "error" in message && typeof message.error === "object",
          (msg) => mcp.handleError(msg)
        ),
        Match.when(
          (message): message is JSONRPCResponse =>
            "result" in message && typeof message.result === "object",
          (msg) => mcp.handleResponse(msg)
        ),
        Match.when(
          (message): message is JSONRPCRequest => "id" in message,
          (msg) => mcp.handleRequest(msg)
        ),

        Match.orElse((msg) => mcp.handleNotification(msg))
      )
    )
  );
