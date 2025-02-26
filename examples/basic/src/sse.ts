import { SSEServerTransport } from "@effect-mcp/server";
import { HttpRouter, HttpServer, type HttpPlatform } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";
import { createServer } from "node:http";
import { ServerLive } from "./shared.js";

const router = HttpRouter.empty.pipe(
  HttpRouter.append(SSEServerTransport.SSERoute("/messages")),
  HttpRouter.append(SSEServerTransport.MessageRoute())
);

export const listen = (
  app: Layer.Layer<
    never,
    never,
    HttpPlatform.HttpPlatform | HttpServer.HttpServer
  >,
  port: number
) =>
  NodeRuntime.runMain(
    Layer.launch(
      Layer.provide(
        app,
        NodeHttpServer.layer(() => createServer(), { port })
      )
    )
  );

const app = router.pipe(HttpServer.serve(), Layer.provide(ServerLive));


listen(app, 3001);
