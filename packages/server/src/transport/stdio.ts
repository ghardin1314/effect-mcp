import * as Terminal from "@effect/platform/Terminal";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FiberRef from "effect/FiberRef";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import { MCP } from "../mcp/mcp.js";
import { Messenger } from "../messenger.js";
import { JSONRPCMessage } from "../schema.js";
import { handleMessage } from "./shared.js";

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

      yield* handleMessage(parsed).pipe(Effect.fork);
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
