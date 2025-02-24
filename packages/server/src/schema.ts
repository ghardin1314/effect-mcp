import { Schema } from "effect";

export const LATEST_PROTOCOL_VERSION = "2024-11-05";
export const SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2024-10-07",
];

export const JSONRPC_VERSION = "2.0";

// Basic schemas
export const ProgressToken = Schema.Union(
  Schema.String,
  Schema.Number.pipe(Schema.int())
);
export type ProgressToken = Schema.Schema.Type<typeof ProgressToken>;

export const Cursor = Schema.String;
export type Cursor = Schema.Schema.Type<typeof Cursor>;

const UnknownStruct = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
});

const BaseRequestParams = Schema.Struct(
  Schema.Struct({
    _meta: Schema.Struct(
      Schema.Struct({
        progressToken: Schema.optional(ProgressToken),
      }).fields,
      UnknownStruct
    ).pipe(Schema.optional),
  }).fields,
  UnknownStruct
);

export const Request = Schema.Struct({
  method: Schema.String,
  params: Schema.optional(BaseRequestParams),
});
export type Request = Schema.Schema.Type<typeof Request>;

const BaseNotificationParams = Schema.Struct(
  Schema.Struct({
    _meta: Schema.Object.pipe(Schema.optional),
  }).fields,
  UnknownStruct
);

export const Notification = Schema.Struct({
  method: Schema.String,
  params: Schema.optional(BaseNotificationParams),
});
export type Notification = Schema.Schema.Type<typeof Notification>;

export const Result = Schema.Struct(
  Schema.Struct({
    _meta: Schema.Object.pipe(Schema.optional),
  }).fields,
  UnknownStruct
);
export type Result = Schema.Schema.Type<typeof Result>;

export const RequestId = Schema.Union(
  Schema.String,
  Schema.Number.pipe(Schema.int())
).pipe(Schema.brand("RequestId"));
export type RequestId = Schema.Schema.Type<typeof RequestId>;

// JSON-RPC schemas
export const JSONRPCRequest = Schema.Struct({
  ...Request.fields,
  jsonrpc: Schema.Literal(JSONRPC_VERSION),
  id: RequestId,
});
export type JSONRPCRequest = Schema.Schema.Type<typeof JSONRPCRequest>;

export const JSONRPCNotification = Schema.Struct({
  ...Notification.fields,
  jsonrpc: Schema.Literal(JSONRPC_VERSION),
});
export type JSONRPCNotification = Schema.Schema.Type<
  typeof JSONRPCNotification
>;

export const JSONRPCResponse = Schema.Struct({
  jsonrpc: Schema.Literal(JSONRPC_VERSION),
  id: RequestId,
  result: Result,
});
export type JSONRPCResponse = Schema.Schema.Type<typeof JSONRPCResponse>;

export const JSONRPCError = Schema.Struct({
  jsonrpc: Schema.Literal(JSONRPC_VERSION),
  id: RequestId,
  error: Schema.Struct({
    code: Schema.Number.pipe(Schema.int()),
    message: Schema.String,
    data: Schema.optional(Schema.Unknown),
  }),
});
export type JSONRPCError = Schema.Schema.Type<typeof JSONRPCError>;

export const JSONRPCMessage = Schema.Union(
  JSONRPCRequest,
  JSONRPCNotification,
  JSONRPCResponse,
  JSONRPCError
);
export type JSONRPCMessage = Schema.Schema.Type<typeof JSONRPCMessage>;

export const EmptyResult = Result.annotations({
  parseOptions: { onExcessProperty: "ignore" },
});
export type EmptyResult = Schema.Schema.Type<typeof EmptyResult>;

export const CancelledNotification = Schema.Struct({
  ...Notification.fields,
  method: Schema.Literal("notifications/cancelled"),
  params: Schema.Struct({
    ...BaseNotificationParams.fields,
    requestId: RequestId,
    reason: Schema.String.pipe(Schema.optional),
  }),
});
export type CancelledNotification = Schema.Schema.Type<
  typeof CancelledNotification
>;

export const Implementation = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
}).annotations({
  parseOptions: {
    onExcessProperty: "preserve",
  },
});
export type Implementation = Schema.Schema.Type<typeof Implementation>;

/**
 * Capabilities a client may support
 */
export const ClientCapabilities = Schema.Struct(
  Schema.Struct({
    experimental: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Unknown })
    ),
    sampling: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Unknown })
    ),
    roots: Schema.optional(
      Schema.Struct(
        Schema.Struct({
          listChanged: Schema.optional(Schema.Boolean),
        }).fields,
        UnknownStruct
      )
    ),
  }).fields,
  UnknownStruct
);
export type ClientCapabilities = Schema.Schema.Type<typeof ClientCapabilities>;

/**
 * Initialize request schema
 */
export const InitializeRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("initialize"),
  params: Schema.Struct({
    ...BaseRequestParams.fields,
    protocolVersion: Schema.String,
    capabilities: ClientCapabilities,
    clientInfo: Implementation,
  }),
});
export type InitializeRequest = Schema.Schema.Type<typeof InitializeRequest>;

/**
 * Server capabilities schema
 */
export const ServerCapabilities = Schema.Struct(
  Schema.Struct({
    experimental: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Unknown })
    ),
    logging: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Unknown })
    ),
    prompts: Schema.optional(
      Schema.Struct(
        Schema.Struct({
          listChanged: Schema.optional(Schema.Boolean),
        }).fields,
        UnknownStruct
      )
    ),
    resources: Schema.optional(
      Schema.Struct(
        Schema.Struct({
          subscribe: Schema.optional(Schema.Boolean),
          listChanged: Schema.optional(Schema.Boolean),
        }).fields,
        UnknownStruct
      )
    ),
    tools: Schema.optional(
      Schema.Struct(
        Schema.Struct({
          listChanged: Schema.optional(Schema.Boolean),
        }).fields,
        UnknownStruct
      )
    ),
  }).fields,
  UnknownStruct
);
export type ServerCapabilities = Schema.Schema.Type<typeof ServerCapabilities>;

/**
 * After receiving an initialize request from the client, the server sends this response.
 */
export const InitializeResult = Schema.Struct({
  ...Result.fields,
  /**
   * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
   */
  protocolVersion: Schema.String,
  capabilities: ServerCapabilities,
  serverInfo: Implementation,
  /**
   * Instructions describing how to use the server and its features.
   *
   * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
   */
  instructions: Schema.optional(Schema.String),
});
export type InitializeResult = Schema.Schema.Type<typeof InitializeResult>;

/**
 * This notification is sent from the client to the server after initialization has finished.
 */
export const InitializedNotification = Schema.Struct({
  ...Notification.fields,
  method: Schema.Literal("notifications/initialized"),
});
export type InitializedNotification = Schema.Schema.Type<
  typeof InitializedNotification
>;

/* Ping */
/**
 * A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.
 */
export const PingRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("ping"),
});
export type PingRequest = Schema.Schema.Type<typeof PingRequest>;

/* Progress notifications */
export const Progress = Schema.Struct(
  Schema.Struct({
    /**
     * The progress thus far. This should increase every time progress is made, even if the total is unknown.
     */
    progress: Schema.Number,
    /**
     * Total number of items to process (or total progress required), if known.
     */
    total: Schema.optional(Schema.Number),
  }).fields,
  UnknownStruct
);
export type Progress = Schema.Schema.Type<typeof Progress>;

/**
 * An out-of-band notification used to inform the receiver of a progress update for a long-running request.
 */
export const ProgressNotification = Schema.Struct({
  ...Notification.fields,
  method: Schema.Literal("notifications/progress"),
  params: Schema.Struct({
    ...BaseNotificationParams.fields,
    ...Progress.fields,
    /**
     * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
     */
    progressToken: ProgressToken,
  }),
});
export type ProgressNotification = Schema.Schema.Type<
  typeof ProgressNotification
>;

/* Pagination */
export const PaginatedRequest = Schema.Struct({
  ...Request.fields,
  params: Schema.optional(
    Schema.Struct({
      ...BaseRequestParams.fields,
      /**
       * An opaque token representing the current pagination position.
       * If provided, the server should return results starting after this cursor.
       */
      cursor: Schema.optional(Cursor),
    })
  ),
});
export type PaginatedRequest = Schema.Schema.Type<typeof PaginatedRequest>;

export const PaginatedResult = Schema.Struct({
  ...Result.fields,
  /**
   * An opaque token representing the pagination position after the last returned result.
   * If present, there may be more results available.
   */
  nextCursor: Schema.optional(Cursor),
});
export type PaginatedResult = Schema.Schema.Type<typeof PaginatedResult>;

/* Resources */
/**
 * The contents of a specific resource or sub-resource.
 */
export const ResourceContents = Schema.Struct(
  Schema.Struct({
    /**
     * The URI of this resource.
     */
    uri: Schema.String,
    /**
     * The MIME type of this resource, if known.
     */
    mimeType: Schema.optional(Schema.String),
  }).fields,
  UnknownStruct
);
export type ResourceContents = Schema.Schema.Type<typeof ResourceContents>;

export const TextResourceContents = Schema.Struct({
  ...ResourceContents.fields,
  /**
   * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
   */
  text: Schema.String,
});
export type TextResourceContents = Schema.Schema.Type<
  typeof TextResourceContents
>;

export const BlobResourceContents = Schema.Struct({
  ...ResourceContents.fields,
  /**
   * A base64-encoded string representing the binary data of the item.
   */
  blob: Schema.String.pipe(Schema.pattern(/^[A-Za-z0-9+/]*={0,2}$/)), // base64 pattern
});
export type BlobResourceContents = Schema.Schema.Type<
  typeof BlobResourceContents
>;

/**
 * A known resource that the server is capable of reading.
 */
export const Resource = Schema.Struct(
  Schema.Struct({
    /**
     * The URI of this resource.
     */
    uri: Schema.String,

    /**
     * A human-readable name for this resource.
     *
     * This can be used by clients to populate UI elements.
     */
    name: Schema.String,

    /**
     * A description of what this resource represents.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    description: Schema.optional(Schema.String),

    /**
     * The MIME type of this resource, if known.
     */
    mimeType: Schema.optional(Schema.String),
  }).fields,
  UnknownStruct
);
export type Resource = Schema.Schema.Type<typeof Resource>;

/**
 * A template description for resources available on the server.
 */
export const ResourceTemplate = Schema.Struct(
  Schema.Struct({
    /**
     * A URI template (according to RFC 6570) that can be used to construct resource URIs.
     */
    uriTemplate: Schema.String,

    /**
     * A human-readable name for the type of resource this template refers to.
     *
     * This can be used by clients to populate UI elements.
     */
    name: Schema.String,

    /**
     * A description of what this template is for.
     *
     * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
     */
    description: Schema.optional(Schema.String),

    /**
     * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
     */
    mimeType: Schema.optional(Schema.String),
  }).fields,
  UnknownStruct
);
export type ResourceTemplate = Schema.Schema.Type<typeof ResourceTemplate>;

/**
 * Sent from the client to request a list of resources the server has.
 */
export const ListResourcesRequest = Schema.Struct({
  ...PaginatedRequest.fields,
  method: Schema.Literal("resources/list"),
});
export type ListResourcesRequest = Schema.Schema.Type<
  typeof ListResourcesRequest
>;

/**
 * The server's response to a resources/list request from the client.
 */
export const ListResourcesResult = Schema.Struct({
  ...PaginatedResult.fields,
  resources: Schema.Array(Resource),
});
export type ListResourcesResult = Schema.Schema.Type<
  typeof ListResourcesResult
>;

/**
 * Sent from the client to request a list of resource templates the server has.
 */
export const ListResourceTemplatesRequest = Schema.Struct({
  ...PaginatedRequest.fields,
  method: Schema.Literal("resources/templates/list"),
});
export type ListResourceTemplatesRequest = Schema.Schema.Type<
  typeof ListResourceTemplatesRequest
>;

/**
 * The server's response to a resources/templates/list request from the client.
 */
export const ListResourceTemplatesResult = Schema.Struct({
  ...PaginatedResult.fields,
  resourceTemplates: Schema.Array(ResourceTemplate),
});
export type ListResourceTemplatesResult = Schema.Schema.Type<
  typeof ListResourceTemplatesResult
>;

/**
 * Sent from the client to the server, to read a specific resource URI.
 */
export const ReadResourceRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("resources/read"),
  params: Schema.Struct({
    ...BaseRequestParams.fields,
    /**
     * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
     */
    uri: Schema.String,
  }),
});
export type ReadResourceRequest = Schema.Schema.Type<
  typeof ReadResourceRequest
>;

/**
 * The server's response to a resources/read request from the client.
 */
export const ReadResourceResult = Schema.Struct({
  ...Result.fields,
  contents: Schema.Array(
    Schema.Union(TextResourceContents, BlobResourceContents)
  ),
});
export type ReadResourceResult = Schema.Schema.Type<typeof ReadResourceResult>;

/**
 * An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.
 */
export const ResourceListChangedNotification = Schema.Struct({
  ...Notification.fields,
  method: Schema.Literal("notifications/resources/list_changed"),
});
export type ResourceListChangedNotification = Schema.Schema.Type<
  typeof ResourceListChangedNotification
>;

/**
 * Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.
 */
export const SubscribeRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("resources/subscribe"),
  params: Schema.Struct({
    ...BaseRequestParams.fields,
    /**
     * The URI of the resource to subscribe to. The URI can use any protocol; it is up to the server how to interpret it.
     */
    uri: Schema.String,
  }),
});
export type SubscribeRequest = Schema.Schema.Type<typeof SubscribeRequest>;

/**
 * Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.
 */
export const UnsubscribeRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("resources/unsubscribe"),
  params: Schema.Struct({
    ...BaseRequestParams.fields,
    /**
     * The URI of the resource to unsubscribe from.
     */
    uri: Schema.String,
  }),
});
export type UnsubscribeRequest = Schema.Schema.Type<typeof UnsubscribeRequest>;

/**
 * A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a resources/subscribe request.
 */
export const ResourceUpdatedNotification = Schema.Struct({
  ...Notification.fields,
  method: Schema.Literal("notifications/resources/updated"),
  params: Schema.Struct({
    ...BaseNotificationParams.fields,
    /**
     * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
     */
    uri: Schema.String,
  }),
});
export type ResourceUpdatedNotification = Schema.Schema.Type<
  typeof ResourceUpdatedNotification
>;

/* Prompts */
/**
 * Describes an argument that a prompt can accept.
 */
export const PromptArgument = Schema.Struct(
  Schema.Struct({
    /**
     * The name of the argument.
     */
    name: Schema.String,
    /**
     * A human-readable description of the argument.
     */
    description: Schema.optional(Schema.String),
    /**
     * Whether this argument must be provided.
     */
    required: Schema.optional(Schema.Boolean),
  }).fields,
  UnknownStruct
);
export type PromptArgument = Schema.Schema.Type<typeof PromptArgument>;

/**
 * A prompt or prompt template that the server offers.
 */
export const Prompt = Schema.Struct(
  Schema.Struct({
    /**
     * The name of the prompt or prompt template.
     */
    name: Schema.String,
    /**
     * An optional description of what this prompt provides
     */
    description: Schema.optional(Schema.String),
    /**
     * A list of arguments to use for templating the prompt.
     */
    arguments: Schema.optional(Schema.Array(PromptArgument)),
  }).fields,
  UnknownStruct
);
export type Prompt = Schema.Schema.Type<typeof Prompt>;

/**
 * Sent from the client to request a list of prompts and prompt templates the server has.
 */
export const ListPromptsRequest = Schema.Struct({
  ...PaginatedRequest.fields,
  method: Schema.Literal("prompts/list"),
});
export type ListPromptsRequest = Schema.Schema.Type<typeof ListPromptsRequest>;

/**
 * The server's response to a prompts/list request from the client.
 */
export const ListPromptsResult = Schema.Struct({
  ...PaginatedResult.fields,
  prompts: Schema.Array(Prompt),
});
export type ListPromptsResult = Schema.Schema.Type<typeof ListPromptsResult>;

/**
 * Used by the client to get a prompt provided by the server.
 */
export const GetPromptRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("prompts/get"),
  params: Schema.Struct({
    ...BaseRequestParams.fields,
    /**
     * The name of the prompt or prompt template.
     */
    name: Schema.String,
    /**
     * Arguments to use for templating the prompt.
     */
    arguments: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.String })
    ),
  }),
});
export type GetPromptRequest = Schema.Schema.Type<typeof GetPromptRequest>;

/**
 * Text provided to or from an LLM.
 */
export const TextContent = Schema.Struct(
  Schema.Struct({
    type: Schema.Literal("text"),
    /**
     * The text content of the message.
     */
    text: Schema.String,
  }).fields,
  UnknownStruct
);
export type TextContent = Schema.Schema.Type<typeof TextContent>;

/**
 * An image provided to or from an LLM.
 */
export const ImageContent = Schema.Struct(
  Schema.Struct({
    type: Schema.Literal("image"),
    /**
     * The base64-encoded image data.
     */
    data: Schema.String.pipe(Schema.pattern(/^[A-Za-z0-9+/]*={0,2}$/)), // base64 pattern
    /**
     * The MIME type of the image. Different providers may support different image types.
     */
    mimeType: Schema.String,
  }).fields,
  UnknownStruct
);
export type ImageContent = Schema.Schema.Type<typeof ImageContent>;

/**
 * The contents of a resource, embedded into a prompt or tool call result.
 */
export const EmbeddedResource = Schema.Struct(
  Schema.Struct({
    type: Schema.Literal("resource"),
    resource: Schema.Union(TextResourceContents, BlobResourceContents),
  }).fields,
  UnknownStruct
);
export type EmbeddedResource = Schema.Schema.Type<typeof EmbeddedResource>;

/**
 * Describes a message returned as part of a prompt.
 */
export const PromptMessage = Schema.Struct(
  Schema.Struct({
    role: Schema.Union(Schema.Literal("user"), Schema.Literal("assistant")),
    content: Schema.Union(TextContent, ImageContent, EmbeddedResource),
  }).fields,
  UnknownStruct
);
export type PromptMessage = Schema.Schema.Type<typeof PromptMessage>;

/**
 * The server's response to a prompts/get request from the client.
 */
export const GetPromptResult = Schema.Struct({
  ...Result.fields,
  /**
   * An optional description for the prompt.
   */
  description: Schema.optional(Schema.String),
  messages: Schema.Array(PromptMessage),
});
export type GetPromptResult = Schema.Schema.Type<typeof GetPromptResult>;

/**
 * An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
export const PromptListChangedNotification = Schema.Struct({
  ...Notification.fields,
  method: Schema.Literal("notifications/prompts/list_changed"),
});
export type PromptListChangedNotification = Schema.Schema.Type<
  typeof PromptListChangedNotification
>;

/* Tools */
/**
 * Definition for a tool the client can call.
 */
export const Tool = Schema.Struct(
  Schema.Struct({
    /**
     * The name of the tool.
     */
    name: Schema.String,
    /**
     * A human-readable description of the tool.
     */
    description: Schema.optional(Schema.String),
    /**
     * A JSON Schema object defining the expected parameters for the tool.
     */
    inputSchema: Schema.Struct(
      Schema.Struct({
        type: Schema.Literal("object"),
        properties: Schema.optional(
          Schema.Record({ key: Schema.String, value: Schema.Unknown })
        ),
      }).fields,
      UnknownStruct
    ),
  }).fields,
  UnknownStruct
);
export type Tool = Schema.Schema.Type<typeof Tool>;

/**
 * Sent from the client to request a list of tools the server has.
 */
export const ListToolsRequest = Schema.Struct({
  ...PaginatedRequest.fields,
  method: Schema.Literal("tools/list"),
});
export type ListToolsRequest = Schema.Schema.Type<typeof ListToolsRequest>;

/**
 * The server's response to a tools/list request from the client.
 */
export const ListToolsResult = Schema.Struct({
  ...PaginatedResult.fields,
  tools: Schema.Array(Tool),
});
export type ListToolsResult = Schema.Schema.Type<typeof ListToolsResult>;

/**
 * The server's response to a tool call.
 */
export const CallToolResult = Schema.Struct({
  ...Result.fields,
  content: Schema.Array(
    Schema.Union(TextContent, ImageContent, EmbeddedResource)
  ),
  isError: Schema.optional(Schema.Boolean),
});
export type CallToolResult = Schema.Schema.Type<typeof CallToolResult>;

/**
 * CallToolResultSchema extended with backwards compatibility to protocol version 2024-10-07.
 */
export const CompatibilityCallToolResult = Schema.Union(
  CallToolResult,
  Schema.Struct({
    ...Result.fields,
    toolResult: Schema.Unknown,
  })
);
export type CompatibilityCallToolResult = Schema.Schema.Type<
  typeof CompatibilityCallToolResult
>;

/**
 * Used by the client to invoke a tool provided by the server.
 */
export const CallToolRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("tools/call"),
  params: Schema.Struct({
    ...BaseRequestParams.fields,
    name: Schema.String,
    arguments: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Unknown })
    ),
  }),
});
export type CallToolRequest = Schema.Schema.Type<typeof CallToolRequest>;

/**
 * An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
export const ToolListChangedNotification = Schema.Struct({
  ...Notification.fields,
  method: Schema.Literal("notifications/tools/list_changed"),
});
export type ToolListChangedNotification = Schema.Schema.Type<
  typeof ToolListChangedNotification
>;

/* Logging */
/**
 * The severity of a log message.
 */
export const LoggingLevel = Schema.Literal(
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "alert",
  "emergency"
);
export type LoggingLevel = Schema.Schema.Type<typeof LoggingLevel>;

/**
 * A request from the client to the server, to enable or adjust logging.
 */
export const SetLevelRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("logging/setLevel"),
  params: Schema.Struct({
    ...BaseRequestParams.fields,
    /**
     * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
     */
    level: LoggingLevel,
  }),
});
export type SetLevelRequest = Schema.Schema.Type<typeof SetLevelRequest>;

/**
 * Notification of a log message passed from server to client. If no logging/setLevel request has been sent from the client, the server MAY decide which messages to send automatically.
 */
export const LoggingMessageNotification = Schema.Struct({
  ...Notification.fields,
  method: Schema.Literal("notifications/message"),
  params: Schema.Struct({
    ...BaseNotificationParams.fields,
    /**
     * The severity of this log message.
     */
    level: LoggingLevel,
    /**
     * An optional name of the logger issuing this message.
     */
    logger: Schema.optional(Schema.String),
    /**
     * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
     */
    data: Schema.Unknown,
  }),
});
export type LoggingMessageNotification = Schema.Schema.Type<
  typeof LoggingMessageNotification
>;

/* Sampling */
/**
 * Hints to use for model selection.
 */
export const ModelHint = Schema.Struct(
  Schema.Struct({
    /**
     * A hint for a model name.
     */
    name: Schema.optional(Schema.String),
  }).fields,
  UnknownStruct
);
export type ModelHint = Schema.Schema.Type<typeof ModelHint>;

/**
 * The server's preferences for model selection, requested of the client during sampling.
 */
export const ModelPreferences = Schema.Struct(
  Schema.Struct({
    /**
     * Optional hints to use for model selection.
     */
    hints: Schema.optional(Schema.Array(ModelHint)),
    /**
     * How much to prioritize cost when selecting a model.
     */
    costPriority: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
    /**
     * How much to prioritize sampling speed (latency) when selecting a model.
     */
    speedPriority: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
    /**
     * How much to prioritize intelligence and capabilities when selecting a model.
     */
    intelligencePriority: Schema.optional(
      Schema.Number.pipe(Schema.between(0, 1))
    ),
  }).fields,
  UnknownStruct
);
export type ModelPreferences = Schema.Schema.Type<typeof ModelPreferences>;

/**
 * Describes a message issued to or received from an LLM API.
 */
export const SamplingMessage = Schema.Struct(
  Schema.Struct({
    role: Schema.Union(Schema.Literal("user"), Schema.Literal("assistant")),
    content: Schema.Union(TextContent, ImageContent),
  }).fields,
  UnknownStruct
);
export type SamplingMessage = Schema.Schema.Type<typeof SamplingMessage>;

/**
 * A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.
 */
export const CreateMessageRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("sampling/createMessage"),
  params: Schema.Struct({
    ...BaseRequestParams.fields,
    messages: Schema.Array(SamplingMessage),
    /**
     * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
     */
    systemPrompt: Schema.optional(Schema.String),
    /**
     * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
     */
    includeContext: Schema.optional(
      Schema.Union(
        Schema.Literal("none"),
        Schema.Literal("thisServer"),
        Schema.Literal("allServers")
      )
    ),
    temperature: Schema.optional(Schema.Number),
    /**
     * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
     */
    maxTokens: Schema.Number.pipe(Schema.int()),
    stopSequences: Schema.optional(Schema.Array(Schema.String)),
    /**
     * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
     */
    metadata: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Unknown })
    ),
    /**
     * The server's preferences for which model to select.
     */
    modelPreferences: Schema.optional(ModelPreferences),
  }),
});
export type CreateMessageRequest = Schema.Schema.Type<
  typeof CreateMessageRequest
>;

/**
 * The client's response to a sampling/create_message request from the server. The client should inform the user before returning the sampled message, to allow them to inspect the response (human in the loop) and decide whether to allow the server to see it.
 */
export const CreateMessageResult = Schema.Struct({
  ...Result.fields,
  /**
   * The name of the model that generated the message.
   */
  model: Schema.String,
  /**
   * The reason why sampling stopped.
   */
  stopReason: Schema.optional(
    Schema.Union(
      Schema.Literal("endTurn"),
      Schema.Literal("stopSequence"),
      Schema.Literal("maxTokens"),
      Schema.String
    )
  ),
  role: Schema.Union(Schema.Literal("user"), Schema.Literal("assistant")),
  content: Schema.Union(TextContent, ImageContent),
});
export type CreateMessageResult = Schema.Schema.Type<
  typeof CreateMessageResult
>;

/* Autocomplete */
/**
 * A reference to a resource or resource template definition.
 */
export const ResourceReference = Schema.Struct(
  Schema.Struct({
    type: Schema.Literal("ref/resource"),
    /**
     * The URI or URI template of the resource.
     */
    uri: Schema.String,
  }).fields,
  UnknownStruct
);
export type ResourceReference = Schema.Schema.Type<typeof ResourceReference>;

/**
 * Identifies a prompt.
 */
export const PromptReference = Schema.Struct(
  Schema.Struct({
    type: Schema.Literal("ref/prompt"),
    /**
     * The name of the prompt or prompt template
     */
    name: Schema.String,
  }).fields,
  UnknownStruct
);
export type PromptReference = Schema.Schema.Type<typeof PromptReference>;

/**
 * A request from the client to the server, to ask for completion options.
 */
export const CompleteRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("completion/complete"),
  params: Schema.Struct({
    ...BaseRequestParams.fields,
    ref: Schema.Union(PromptReference, ResourceReference),
    /**
     * The argument's information
     */
    argument: Schema.Struct(
      Schema.Struct({
        /**
         * The name of the argument
         */
        name: Schema.String,
        /**
         * The value of the argument to use for completion matching.
         */
        value: Schema.String,
      }).fields,
      UnknownStruct
    ),
  }),
});
export type CompleteRequest = Schema.Schema.Type<typeof CompleteRequest>;

/**
 * The server's response to a completion/complete request
 */
export const CompleteResult = Schema.Struct({
  ...Result.fields,
  completion: Schema.Struct(
    Schema.Struct({
      /**
       * An array of completion values. Must not exceed 100 items.
       */
      values: Schema.Array(Schema.String).pipe(Schema.maxItems(100)),
      /**
       * The total number of completion options available. This can exceed the number of values actually sent in the response.
       */
      total: Schema.optional(Schema.Number.pipe(Schema.int())),
      /**
       * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
       */
      hasMore: Schema.optional(Schema.Boolean),
    }).fields,
    UnknownStruct
  ),
});
export type CompleteResult = Schema.Schema.Type<typeof CompleteResult>;

/* Roots */
/**
 * Represents a root directory or file that the server can operate on.
 */
export const Root = Schema.Struct(
  Schema.Struct({
    /**
     * The URI identifying the root. This *must* start with file:// for now.
     */
    uri: Schema.String.pipe(Schema.startsWith("file://")),
    /**
     * An optional name for the root.
     */
    name: Schema.optional(Schema.String),
  }).fields,
  UnknownStruct
);

/**
 * Sent from the server to request a list of root URIs from the client.
 */
export const ListRootsRequest = Schema.Struct({
  ...Request.fields,
  method: Schema.Literal("roots/list"),
});
export type ListRootsRequest = Schema.Schema.Type<typeof ListRootsRequest>;

/**
 * The client's response to a roots/list request from the server.
 */
export const ListRootsResult = Schema.Struct({
  ...Result.fields,
  roots: Schema.Array(Root),
});
export type ListRootsResult = Schema.Schema.Type<typeof ListRootsResult>;

/**
 * A notification from the client to the server, informing it that the list of roots has changed.
 */
export const RootsListChangedNotification = Schema.Struct({
  ...Notification.fields,
  method: Schema.Literal("notifications/roots/list_changed"),
});
export type RootsListChangedNotification = Schema.Schema.Type<
  typeof RootsListChangedNotification
>;

/* Client messages */
export const ClientRequest = Schema.Union(
  PingRequest,
  InitializeRequest,
  CompleteRequest,
  SetLevelRequest,
  GetPromptRequest,
  ListPromptsRequest,
  ListResourcesRequest,
  ListResourceTemplatesRequest,
  ReadResourceRequest,
  SubscribeRequest,
  UnsubscribeRequest,
  CallToolRequest,
  ListToolsRequest
);
export type ClientRequest = Schema.Schema.Type<typeof ClientRequest>;

export const ClientNotification = Schema.Union(
  CancelledNotification,
  ProgressNotification,
  InitializedNotification,
  RootsListChangedNotification
);
export type ClientNotification = Schema.Schema.Type<typeof ClientNotification>;

export const ClientResult = Schema.Union(
  EmptyResult,
  CreateMessageResult,
  ListRootsResult
);
export type ClientResult = Schema.Schema.Type<typeof ClientResult>;

/* Server messages */
export const ServerRequest = Schema.Union(
  PingRequest,
  CreateMessageRequest,
  ListRootsRequest
);
export type ServerRequest = Schema.Schema.Type<typeof ServerRequest>;

export const ServerNotification = Schema.Union(
  CancelledNotification,
  ProgressNotification,
  LoggingMessageNotification,
  ResourceUpdatedNotification,
  ResourceListChangedNotification,
  ToolListChangedNotification,
  PromptListChangedNotification
);
export type ServerNotification = Schema.Schema.Type<typeof ServerNotification>;

export const ServerResult = Schema.Union(
  EmptyResult,
  InitializeResult,
  CompleteResult,
  GetPromptResult,
  ListPromptsResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ReadResourceResult,
  CallToolResult,
  ListToolsResult
);
export type ServerResult = Schema.Schema.Type<typeof ServerResult>;
