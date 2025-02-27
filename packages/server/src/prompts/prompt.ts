import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { JsonRpcError } from "../error.js";
import type { PromptMessage } from "../schema.js";

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect-mcp/server/Prompt");

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId;

export type Prompt<Args extends Schema.Struct.Fields, R> = PromptEffect<
  Args,
  R
>; // TODO: Add others like dynamic, etc.

export interface PromptEffect<Args extends Schema.Struct.Fields, R>
  extends Prompt.Proto<Args> {
  readonly _tag: "Effect";
  readonly handler: (
    args: Schema.Struct.Type<Args>
  ) => Effect.Effect<readonly PromptMessage[], JsonRpcError, R>;
}

/**
 * Initial idea on how to handle dynamic prompts, like pulling from a database, etc.
 */
interface PromptDynamic<Args extends Schema.Struct.Fields, R> {
  readonly _tag: "Dynamic";
  readonly populate: (cursor?: string | undefined) => Effect.Effect<
    {
      prompts: ReadonlyArray<Prompt.Proto<Args>>;
      nextCursor?: string | undefined;
    },
    any,
    R
  >;
  readonly handler: (
    args: any
  ) => Effect.Effect<readonly PromptMessage[], JsonRpcError, R>;
}

export namespace Prompt {
  export interface Proto<Args extends Schema.Struct.Fields> {
    readonly [TypeId]: TypeId;
    readonly _tag: string;
    readonly arguments: Args;
    readonly description: string;
    readonly name: string;
  }

  export interface Any extends Prompt<any, any> {}

  export type Context<P extends Prompt<any, any>> = P extends Prompt<
    infer _Args,
    infer R
  >
    ? R
    : never;
}

export const effect = <Args extends Schema.Struct.Fields, R>(
  params: { name: string; description: string; arguments: Args },
  handler: (
    args: Schema.Struct.Type<Args>
  ) => Effect.Effect<readonly PromptMessage[], JsonRpcError, R>
): Prompt<Args, R> => ({
  _tag: "Effect",
  handler,
  arguments: params.arguments,
  description: params.description,
  name: params.name,
  [TypeId]: TypeId,
});
