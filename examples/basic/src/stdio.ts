#!/usr/bin/env node

import { StdioServerTransport } from "@effect-mcp/server";
import { PlatformLogger } from "@effect/platform";
import {
  NodeContext,
  NodeFileSystem,
  NodeRuntime,
} from "@effect/platform-node";
import { Effect, FiberRef, HashSet, Layer, Logger, LogLevel } from "effect";
import { ServerLive } from "./shared.js";

// TODO: Clear loggers as part of stdio transport
export const clearAllLoggers = Layer.scopedDiscard(
  Effect.locallyScoped(FiberRef.currentLoggers, HashSet.empty())
);

const fileLogger = Logger.logfmtLogger.pipe(PlatformLogger.toFile("stdio.log"));
const LoggerLive = Logger.replaceScoped(Logger.defaultLogger, fileLogger).pipe(
  Layer.provide(NodeFileSystem.layer),
  Layer.provide(clearAllLoggers)
);

const AppLive = Layer.provideMerge(ServerLive, NodeContext.layer).pipe(
  Layer.provideMerge(Layer.scope)
);

StdioServerTransport.make.pipe(
  Effect.provide(LoggerLive),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.provide(AppLive),
  NodeRuntime.runMain
);
