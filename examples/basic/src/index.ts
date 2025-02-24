#!/usr/bin/env node

import { McpServer, StdioServerTransport } from "@effect-mcp/server";
import { AiToolkit } from "@effect/ai";
import { PlatformLogger } from "@effect/platform";
import {
  NodeContext,
  NodeFileSystem,
  NodeRuntime,
} from "@effect/platform-node";
import {
  Effect,
  FiberRef,
  HashSet,
  Layer,
  Logger,
  LogLevel,
  Schema,
} from "effect";
// TODO: Clear loggers as part of stdio transport
export const clearAllLoggers = Layer.scopedDiscard(
  Effect.locallyScoped(FiberRef.currentLoggers, HashSet.empty())
);

const fileLogger = Logger.logfmtLogger.pipe(PlatformLogger.toFile("stdio.log"));
const LoggerLive = Logger.replaceScoped(Logger.defaultLogger, fileLogger).pipe(
  Layer.provide(NodeFileSystem.layer),
  Layer.provide(clearAllLoggers)
);

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

const ServerLive = McpServer.layer({
  name: "Echo",
  version: "0.0.1",
}).pipe(Layer.provide(ToolkitLive), Layer.provide(Layer.scope));

const AppLive = Layer.provideMerge(ServerLive, NodeContext.layer).pipe(
  //   Layer.provide(clearAllLoggers),
  Layer.provideMerge(Layer.scope)
);

StdioServerTransport.make.pipe(
  Effect.provide(LoggerLive),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.provide(AppLive),
  NodeRuntime.runMain
);
