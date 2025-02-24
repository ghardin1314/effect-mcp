import { Effect, Layer, Match, Schema, Scope } from "effect";
import { JsonRpcError } from "../error.js";
import { Messenger } from "../messenger.js";
import {
  CallToolRequest,
  ClientNotification,
  ClientRequest,
  ClientResult,
  CompleteRequest,
  GetPromptRequest,
  JSONRPCError,
  JSONRPCNotification,
  JSONRPCRequest,
  JSONRPCResponse,
  LATEST_PROTOCOL_VERSION,
  ListPromptsRequest,
  ListResourcesRequest,
  ListResourceTemplatesRequest,
  ListRootsResult,
  ListToolsRequest,
  ReadResourceRequest,
  SetLevelRequest,
  SubscribeRequest,
  UnsubscribeRequest,
  type CreateMessageResult,
  type Implementation,
  type InitializeRequest,
  type InitializeResult,
  type PingRequest,
  type RequestId,
} from "../schema.js";
import * as MCP from "./mcp.js";

export const make = (
  config: Implementation
): Effect.Effect<MCP.MCP.Service, never, Scope.Scope | Messenger> =>
  Effect.gen(function* () {
    const messenger = yield* Messenger;
    // TODO: Add tools, prompts, resources, etc.

    const _notImplemented = (...args: any[]) =>
      Effect.gen(function* () {
        yield* Effect.logDebug(`Not implemented: ${args.join(" ")}`);
      });

    const _handlePing = Effect.fn("HandlePing")(function* (
      id: RequestId,
      message: PingRequest
    ) {
      yield* messenger.sendResult(id, {
        _meta: {
          pong: true,
        },
      });
    });

    const _handleInitialize = Effect.fn("HandleInitialize")(function* (
      id: RequestId,
      message: InitializeRequest
    ) {
      // TODO: Validate client info

      const response: InitializeResult = {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        // TODO: Get from tools, etc.
        capabilities: {},
        // TODO: Make Configurable
        serverInfo: config,
      };

      yield* messenger.sendResult(id, response);
    });

    const _handleComplete = Effect.fn("HandleComplete")(function* (
      id: RequestId,
      message: CompleteRequest
    ) {
      // TODO: Implement
    });

    const _handleSetLevel = Effect.fn("HandleSetLevel")(function* (
      id: RequestId,
      message: SetLevelRequest
    ) {
      // TODO: Implement
    });

    const _handleGetPrompt = Effect.fn("HandleGetPrompt")(function* (
      id: RequestId,
      message: GetPromptRequest
    ) {
      // TODO: Implement
    });

    const _handleListPrompts = Effect.fn("HandleListPrompts")(function* (
      id: RequestId,
      message: ListPromptsRequest
    ) {
      // TODO: Implement
    });

    const _handleListTools = Effect.fn("HandleListTools")(function* (
      id: RequestId,
      message: ListToolsRequest
    ) {
      // TODO: Implement
    });

    const _handleCallTool = Effect.fn("HandleCallTool")(function* (
      id: RequestId,
      message: CallToolRequest
    ) {
      // TODO: Implement
    });

    const _handleListResources = Effect.fn("HandleListResources")(function* (
      id: RequestId,
      message: ListResourcesRequest
    ) {
      // TODO: Implement
    });

    const _handleReadResource = Effect.fn("HandleReadResource")(function* (
      id: RequestId,
      message: ReadResourceRequest
    ) {
      // TODO: Implement
    });

    const _handleSubscribeToResourceList = Effect.fn(
      "HandleSubscribeToResourceList"
    )(function* (id: RequestId, message: SubscribeRequest) {
      // TODO: Implement
    });

    const _handleUnsubscribeFromResourceList = Effect.fn(
      "HandleUnsubscribeFromResourceList"
    )(function* (id: RequestId, message: UnsubscribeRequest) {
      // TODO: Implement
    });

    const _handleListResourceTemplates = Effect.fn(
      "HandleListResourceTemplates"
    )(function* (id: RequestId, message: ListResourceTemplatesRequest) {
      // TODO: Implement
    });

    const handleRequest = Effect.fn("HandleRequest")(function* (
      rawMessage: JSONRPCRequest
    ) {
      return yield* Effect.gen(function* () {
        const message = yield* Schema.decodeUnknown(ClientRequest)({
          method: rawMessage.method,
          params: rawMessage.params,
        }).pipe(
          Effect.mapError((error) =>
            JsonRpcError.fromCode("ParseError", error.message, error.issue)
          )
        );
        Match.value(message).pipe(
          Match.when({ method: "ping" }, (msg) =>
            _handlePing(rawMessage.id, msg)
          ),
          Match.when({ method: "initialize" }, (msg) =>
            _handleInitialize(rawMessage.id, msg)
          ),
          Match.when({ method: "completion/complete" }, (msg) =>
            _handleComplete(rawMessage.id, msg)
          ),
          Match.when({ method: "logging/setLevel" }, (msg) =>
            _handleSetLevel(rawMessage.id, msg)
          ),
          Match.when({ method: "prompts/get" }, (msg) =>
            _handleGetPrompt(rawMessage.id, msg)
          ),
          Match.when({ method: "prompts/list" }, (msg) =>
            _handleListPrompts(rawMessage.id, msg)
          ),
          Match.when({ method: "resources/list" }, (msg) =>
            _handleListResources(rawMessage.id, msg)
          ),
          Match.when({ method: "resources/read" }, (msg) =>
            _handleReadResource(rawMessage.id, msg)
          ),
          Match.when({ method: "resources/subscribe" }, (msg) =>
            _handleSubscribeToResourceList(rawMessage.id, msg)
          ),
          Match.when({ method: "resources/unsubscribe" }, (msg) =>
            _handleUnsubscribeFromResourceList(rawMessage.id, msg)
          ),
          Match.when({ method: "resources/templates/list" }, (msg) =>
            _handleListResourceTemplates(rawMessage.id, msg)
          ),
          Match.when({ method: "tools/list" }, (msg) =>
            _handleListTools(rawMessage.id, msg)
          ),
          Match.when({ method: "tools/call" }, (msg) =>
            _handleCallTool(rawMessage.id, msg)
          ),
          Match.exhaustive
        );
      }).pipe(
        Effect.catchTag("JsonRpcError", (err) =>
          messenger.sendError(rawMessage.id, err)
        )
      );
    });

    const handleError = Effect.fn("HandleError")(function* (
      message: JSONRPCError
    ) {
      // TODO: Implement
    });

    const handleResponse = Effect.fn("HandleResponse")(function* (
      message: JSONRPCResponse
    ) {
      return yield* Effect.gen(function* () {
        const response = yield* Schema.decodeUnknown(ClientResult)(
          message.result
        ).pipe(
          Effect.mapError((error) =>
            JsonRpcError.fromCode("ParseError", error.message, error.issue)
          )
        );

        Match.value(response).pipe(
          Match.when(
            (message): message is CreateMessageResult => "model" in message,
            _notImplemented
          ),
          Match.when(
            (message): message is ListRootsResult => "roots" in message,
            _notImplemented
          ),
          // Empty response
          Match.orElse(_notImplemented)
        );
      }).pipe(
        Effect.catchTag("JsonRpcError", (err) =>
          messenger.sendError(message.id, err)
        )
      );
    });

    const handleNotification = Effect.fn("HandleNotification")(function* (
      message: JSONRPCNotification
    ) {
      return yield* Effect.gen(function* () {
        const notification = yield* Schema.decodeUnknown(ClientNotification)({
          method: message.method,
          params: message.params,
        }).pipe(
          Effect.mapError((error) =>
            JsonRpcError.fromCode("ParseError", error.message, error.issue)
          )
        );

        yield* Match.value(notification).pipe(
          Match.when({ method: "notifications/cancelled" }, (msg) =>
            _notImplemented(msg)
          ),
          Match.when({ method: "notifications/progress" }, (msg) =>
            _notImplemented(msg)
          ),
          Match.when({ method: "notifications/initialized" }, (msg) =>
            _notImplemented(msg)
          ),
          Match.when({ method: "notifications/roots/list_changed" }, (msg) =>
            _notImplemented(msg)
          ),
          Match.exhaustive
        );
      }).pipe(
        Effect.catchTag("JsonRpcError", (err) =>
          Effect.logError(`Error handling notification: ${err.message}`)
        )
      );
    });

    return {
      handleRequest,
      handleError,
      handleResponse,
      handleNotification,
    } satisfies MCP.MCP.Service;
  });

export const layer = (config: Implementation) =>
  Layer.effect(MCP.MCP, make(config)).pipe(
    Layer.provideMerge(Messenger.Default)
  );
