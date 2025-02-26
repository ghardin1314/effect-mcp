import { McpServer } from "@effect-mcp/server";
import { AiToolkit } from "@effect/ai";
import { Effect, Layer, Schema } from "effect";

class Echo extends Schema.TaggedRequest<Echo>()(
  "Echo",
  {
    success: Schema.String,
    failure: Schema.String,
    payload: {
      message: Schema.String,
    },
  },
  { description: "Echo a message" }
) {}

const toolkit = AiToolkit.empty.add(Echo);

const ToolkitLive = toolkit.implement((handlers) =>
  handlers.handle("Echo", (params) => Effect.succeed(`Echo: ${params.message}`))
);

export const ServerLive = McpServer.layer({
  name: "Echo",
  version: "0.0.1",
}).pipe(Layer.provide(ToolkitLive), Layer.provide(Layer.scope));
