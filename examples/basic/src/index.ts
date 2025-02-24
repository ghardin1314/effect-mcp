#!/usr/bin/env node

import { McpServer, StdioServerTransport } from "@effect-mcp/server";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";

const ServerLive = McpServer.layer({
  name: "basic-mcp",
  version: "0.0.1",
}).pipe(Layer.provide(Layer.scope));

const AppLive = Layer.provideMerge(ServerLive, NodeContext.layer).pipe(
  Layer.provideMerge(Layer.scope)
);

NodeRuntime.runMain(StdioServerTransport.make.pipe(Effect.provide(AppLive)));
