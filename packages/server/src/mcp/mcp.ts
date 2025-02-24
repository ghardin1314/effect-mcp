import { Context, type Effect } from "effect";
import type { JsonRpcError } from "../error.js";
import type {
  JSONRPCError,
  JSONRPCNotification,
  JSONRPCRequest,
  JSONRPCResponse,
} from "../schema.js";

export namespace MCP {
  export interface Service {
    handleError: (message: JSONRPCError) => Effect.Effect<void>;
    handleResponse: (
      message: JSONRPCResponse
    ) => Effect.Effect<void>;
    handleNotification: (
      message: JSONRPCNotification
    ) => Effect.Effect<void>;
    handleRequest: (
      message: JSONRPCRequest
    ) => Effect.Effect<void>;
  }
}

export class MCP extends Context.Tag("MCP")<MCP, MCP.Service>() {}
