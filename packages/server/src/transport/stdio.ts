import { Terminal } from "@effect/platform";
import {
  Context,
  Effect,
  FiberRef,
  HashSet,
  Layer,
  Match,
  Queue,
  Schedule,
  Schema,
} from "effect";
import { MCP } from "../mcp/mcp.js";
import { Messenger } from "../messenger.js";
import {
  JSONRPCError,
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from "../schema.js";

export class StdioServerTransport extends Context.Tag(
  "@effect-mcp/server/StdioServerTransport"
)<StdioServerTransport, void>() {}

export const make = Effect.gen(function* () {
  const messenger = yield* Messenger;
  const mcp = yield* MCP;
  const terminal = yield* Terminal.Terminal;
  // const fs = yield* FileSystem.FileSystem;

  const outbound = yield* messenger.outbound.subscribe;

  // Start listening for messages to send via stdout
  yield* Effect.gen(function* () {
    const response = yield* Queue.take(outbound);
    yield* Effect.log(`Sending message:`, response);

    const encoded = yield* Schema.encode(JSONRPCMessage)(response);

    yield* terminal.display(JSON.stringify(encoded) + "\n");
  }).pipe(Effect.repeat(Schedule.forever), Effect.fork);

  // Start listening for messages via stdin
  yield* Effect.gen(function* () {
    const input = yield* terminal.readLine;

    yield* Effect.log(`Received message: ${input}`);

    if (input) {
      const parsed = yield* Schema.decodeUnknown(JSONRPCMessage)(
        JSON.parse(input)
      );

      yield* Match.value(parsed)
        .pipe(
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
        .pipe(Effect.fork);
    }
  }).pipe(
    Effect.catchTag("ParseError", (err) =>
      Effect.logError(`Error parsing message: ${err.message}`)
    ),
    Effect.repeat(Schedule.forever)
  );
});

// TODO: Clear loggers as part of stdio transport
export const clearAllLoggers = Layer.scopedDiscard(
  Effect.locallyScoped(FiberRef.currentLoggers, HashSet.empty())
);

export const layer = Layer.effect(StdioServerTransport, make);
