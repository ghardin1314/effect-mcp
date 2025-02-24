import { Effect, PubSub } from "effect";
import type { JsonRpcError } from "./error.js";
import type {
  JSONRPCMessage,
  Notification,
  Request,
  RequestId,
  Result,
} from "./schema.js";

export class Messenger extends Effect.Service<Messenger>()(
  "@effect-mcp/server/Messenger",
  {
    effect: Effect.gen(function* () {
      const outbound = yield* PubSub.bounded<JSONRPCMessage>(100);

      const sendResult = Effect.fn("SendResult")(function* (
        id: RequestId,
        result: Result
      ) {
        yield* Effect.log(`Sending result:`, result);
        yield* PubSub.publish(outbound, {
          jsonrpc: "2.0",
          id: id,
          result: result,
        });
      });

      const sendError = Effect.fn("SendError")(function* (
        id: RequestId,
        error: JsonRpcError
      ) {
        yield* Effect.log(`Sending error:`, error);
        yield* PubSub.publish(outbound, {
          jsonrpc: "2.0",
          id: id,
          error: error,
        });
      });

      const sendNotification = Effect.fn("SendNotification")(function* (
        notification: Notification
      ) {
        yield* Effect.log(`Sending notification:`, notification);
        yield* PubSub.publish(outbound, {
          jsonrpc: "2.0",
          method: notification.method,
          params: notification.params,
        });
      });

      const sendRequest = Effect.fn("SendRequest")(function* (
        request: Request
      ) {
        yield* Effect.log(`Sending request:`, request);
        yield* PubSub.publish(outbound, {
          jsonrpc: "2.0",
          method: request.method,
          params: request.params,
        });
      });

      return {
        outbound,
        sendResult,
        sendError,
        sendNotification,
        sendRequest,
      };
    }),
  }
) {}
