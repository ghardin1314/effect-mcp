// SSE Api Route

import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import * as HttpHeaders from "@effect/platform/Headers";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { Messenger } from "../messenger.js";
import { JSONRPCMessage } from "../schema.js";
import { handleMessage } from "./shared.js";

export const SSERoute = (msgEndpoint: string) =>
  HttpRouter.makeRoute(
    "GET",
    "/sse",
    Effect.gen(function* () {
      const sessionId = crypto.randomUUID();
      const messenger = yield* Messenger;
      yield* Effect.log(`New SSE session: ${sessionId}`);
      // TODO: Filter by sessionId or make new stream per session
      const outboundStream = Stream.fromPubSub(messenger.outbound).pipe(
        Stream.flatMap((message) => Schema.encode(JSONRPCMessage)(message)),
        Stream.map(
          (message) => `event: message\ndata: ${JSON.stringify(message)}\n\n`
        )
      );

      const endpointMsg = Stream.succeed(
        `event: endpoint\ndata: ${msgEndpoint}?sessionId=${sessionId}\n\n`
      );

      const encoder = new TextEncoder();

      const stream = pipe(
        endpointMsg,
        Stream.merge(outboundStream),
        Stream.tap((msg) => Effect.log(`Stream message: ${msg}`)),
        Stream.map((msg) => encoder.encode(msg))
      );

      const headers = HttpHeaders.fromInput({
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "x-accel-buffering": "no",
        connection: "keep-alive", // if (req.httpVersion !== "2.0")
      });

      // TODO: Store session id in cache

      return HttpServerResponse.stream(stream, {
        contentType: "text/event-stream",
        headers,
      });
    })
  );

// Post Message Route

export const MessageRoute = () =>
  HttpRouter.makeRoute(
    "POST",
    "/messages",
    Effect.gen(function* () {
      // TODO: Check for session id

      const message = yield* HttpServerRequest.schemaBodyJson(JSONRPCMessage);

      yield* Effect.log(`Received message:`, message);

      yield* handleMessage(message).pipe(Effect.forkDaemon);

      return yield* HttpServerResponse.text("Accepted", { status: 202 });
    })
  );
