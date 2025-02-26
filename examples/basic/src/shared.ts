import { McpServer, PromptKit } from "@effect-mcp/server";
import { AiToolkit } from "@effect/ai";
import { Effect, Layer, Schema } from "effect";

/**
 * Tools
 */

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

/**
 * Prompts
 */

const PromptkitLive = PromptKit.empty
  .add({
    name: "Echo",
    description: "Echo a message",
    arguments: {
      message: Schema.String.annotations({
        description: "The message to echo",
      }),
    },
    handler: (params) =>
      Effect.succeed([
        {
          role: "user",
          content: {
            type: "text",
            text: `Echo: ${params.message}`,
          },
        },
      ]),
  })
  .finalize();

/**
 * Server
 */

export const ServerLive = McpServer.layer({
  name: "Echo",
  version: "0.0.1",
}).pipe(
  Layer.provide(ToolkitLive),
  Layer.provide(PromptkitLive),
  Layer.provide(Layer.scope)
);
