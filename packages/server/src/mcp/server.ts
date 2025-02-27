import { AiToolkit } from "@effect/ai";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as HashMap from "effect/HashMap";
import * as JsonSchema from "effect/JSONSchema";
import * as AST from "effect/SchemaAST";
import { JsonRpcError } from "../error.js";
import { Messenger } from "../messenger.js";
import * as PromptKit from "../prompts/prompt-kit.js";
import {
  CallToolRequest,
  CallToolResult,
  ClientNotification,
  ClientRequest,
  ClientResult,
  CompleteRequest,
  GetPromptRequest,
  GetPromptResult,
  JSONRPCError,
  JSONRPCNotification,
  JSONRPCRequest,
  JSONRPCResponse,
  LATEST_PROTOCOL_VERSION,
  ListPromptsRequest,
  ListPromptsResult,
  ListResourcesRequest,
  ListResourceTemplatesRequest,
  ListRootsResult,
  ListToolsRequest,
  ListToolsResult,
  Prompt,
  PromptMessage,
  ReadResourceRequest,
  SetLevelRequest,
  SubscribeRequest,
  Tool,
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
): Effect.Effect<
  MCP.MCP.Service,
  never,
  Scope.Scope | Messenger | AiToolkit.Registry
> =>
  Effect.gen(function* () {
    const messenger = yield* Messenger;
    const toolkit = yield* Effect.serviceOption(AiToolkit.Registry);
    const promptkit = yield* Effect.serviceOption(PromptKit.Registry);
    // TODO: Add tools, prompts, resources, etc.

    const _notImplemented = (...args: any[]) =>
      Effect.gen(function* () {
        yield* Effect.logDebug(`Not implemented`, args);
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
      yield* Effect.log(`Initializing server with client info:`, message);

      const response: InitializeResult = {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        // TODO: Get from tools, etc.
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
          resourceTemplates: {},
        },
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
      if (Option.isNone(promptkit)) {
        return yield* messenger.sendError(
          id,
          JsonRpcError.fromCode("InvalidParams", "No prompts available")
        );
      }

      const prompt = HashMap.get(promptkit.value, message.params.name);
      if (Option.isNone(prompt)) {
        return yield* messenger.sendError(
          id,
          JsonRpcError.fromCode("InvalidParams", "Prompt not found")
        );
      }

      const decodeArgs = Schema.decodeUnknown(
        Schema.Struct(prompt.value.arguments)
      );
      const encodeSuccess = Schema.encode(Schema.Array(PromptMessage));

      const args = yield* decodeArgs(message.params.arguments).pipe(
        Effect.mapError((err) =>
          JsonRpcError.fromCode("ParseError", err.message, err.issue)
        ),
        Effect.flatMap(prompt.value.handler),
        Effect.mapError((err) =>
          JsonRpcError.fromCode("InternalError", "Error calling prompt", err)
        ),
        Effect.flatMap((messages) =>
          encodeSuccess(messages).pipe(
            Effect.mapError((err) =>
              JsonRpcError.fromCode("ParseError", err.message, err.issue)
            )
          )
        )
      ) as Effect.Effect<PromptMessage[], JsonRpcError>;

      const result: GetPromptResult = {
        messages: args,
      };

      yield* messenger.sendResult(id, result);
    });

    const _handleListPrompts = Effect.fn("HandleListPrompts")(function* (
      id: RequestId,
      message: ListPromptsRequest
    ) {
      const prompts: Prompt[] = [];

      if (Option.isNone(promptkit)) {
        const data: ListPromptsResult = {
          prompts,
        };
        return yield* messenger.sendResult(id, data);
      }

      for (const prompt of HashMap.values(promptkit.value)) {
        const ast = Schema.Struct(prompt.arguments).ast;
        const propertySigs = AST.getPropertySignatures(ast);
        const args = propertySigs.map((prop) => ({
          name: prop.name.toString(),
          description: (prop.annotations.description ?? "") as string,
          required: !prop.isOptional,
        }));

        console.dir({ ast, propertySigs, args }, { depth: null });

        prompts.push({
          name: prompt.name,
          description: prompt.description,
          arguments: args,
        });
      }

      const data: ListPromptsResult = {
        prompts,
      };
      return yield* messenger.sendResult(id, data);
    });

    const _handleListTools = Effect.fn("HandleListTools")(function* (
      id: RequestId,
      message: ListToolsRequest
    ) {
      const tools: Tool[] = [];

      if (Option.isNone(toolkit)) {
        const data: ListToolsResult = {
          tools,
        };
        return yield* messenger.sendResult(id, data);
      }

      yield* Effect.forEach(toolkit.value.keys(), (schema) =>
        Effect.gen(function* () {
          const ast = (schema as any).ast;

          tools.push({
            name: schema._tag,
            inputSchema: makeJsonSchema(ast) as any,
            description: getDescription(ast),
          });
        })
      );

      const data: ListToolsResult = {
        tools,
      };
      return yield* messenger.sendResult(id, data);
    });

    const _handleCallTool = Effect.fn("HandleCallTool")(function* (
      id: RequestId,
      message: CallToolRequest
    ) {
      // TODO: Implement
      if (Option.isNone(toolkit)) {
        return yield* messenger.sendError(
          id,
          JsonRpcError.fromCode(
            "InvalidParams",
            "The tool does not exist / is not available."
          )
        );
      }

      const tool = Array.from(toolkit.value.entries()).find(
        ([schema, _]) => schema._tag === message.params.name
      );
      if (!tool) {
        return yield* messenger.sendError(
          id,
          JsonRpcError.fromCode(
            "InvalidParams",
            "The tool does not exist / is not available."
          )
        );
      }
      const decodeArgs = Schema.decodeUnknown(tool[0] as any);
      const encodeSuccess = Schema.encode(tool[0].success);

      const output = yield* decodeArgs(
        injectTag(message.params.arguments, message.params.name)
      ).pipe(
        Effect.mapError((err) =>
          JsonRpcError.fromCode("ParseError", err.message, err.issue)
        ),
        Effect.flatMap(tool[1]),
        Effect.mapError((err) =>
          JsonRpcError.fromCode("InternalError", "Error calling tool", err)
        ),
        Effect.flatMap((res) =>
          encodeSuccess(res).pipe(
            Effect.mapError((err) =>
              JsonRpcError.fromCode(
                "ParseError",
                "Error encoding tool result",
                err
              )
            )
          )
        )
      ) as Effect.Effect<any, JsonRpcError>;

      const result: CallToolResult = {
        content: [
          {
            type: "text",
            text: JSON.stringify(output),
          },
        ],
      };

      yield* messenger.sendResult(id, result);
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

        yield* Effect.log(`Handling request:`, message);

        yield* Match.value(message).pipe(
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
        Effect.tapError((err) =>
          Effect.logError(`Error handling request: ${err.message}`)
        ),
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

/**
 *
 * Internal utilities copied from `@effect/ai` since they are not exported.
 */

/**
 *
 * @param ast
 * @returns
 */

const makeJsonSchema = (ast: AST.AST): JsonSchema.JsonSchema7 => {
  const $defs = {};
  const schema = JsonSchema.fromAST(ast, {
    definitions: $defs,
    topLevelReferenceStrategy: "skip",
  });
  if (Object.keys($defs).length === 0) return schema;
  (schema as any).$defs = $defs;
  return schema;
};

const getDescription = (ast: AST.AST): string => {
  const annotations =
    ast._tag === "Transformation"
      ? {
          ...ast.to.annotations,
          ...ast.annotations,
        }
      : ast.annotations;
  return AST.DescriptionAnnotationId in annotations
    ? (annotations[AST.DescriptionAnnotationId] as string)
    : "";
};

/**
 * Certain providers (i.e. Anthropic) do not do a great job returning the
 * `_tag` enum with the parameters for a tool call. This method ensures that
 * the `_tag` is injected into the tool call parameters to avoid issues when
 * decoding.
 */
function injectTag(params: unknown, tag: string) {
  // If for some reason we do not receive an object back for the tool call
  // input parameters, just return them unchanged
  if (!Predicate.isObject(params)) {
    return params;
  }
  // If the tool's `_tag` is already present in input parameters, return them
  // unchanged
  if (Predicate.hasProperty(params, "_tag")) {
    return params;
  }
  // Otherwise inject the tool's `_tag` into the input parameters
  return { ...params, _tag: tag };
}
