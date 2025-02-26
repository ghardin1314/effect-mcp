import { Effect, HashMap, Inspectable, Schema } from "effect";
import { pipeArguments, type Pipeable } from "effect/Pipeable";
import type { JsonRpcError } from "./error.js";
import type { PromptMessage } from "./schema.js";

// TODO: Track Dependencies
type PromptHandler<Args extends Schema.Struct.Fields> = (
  args: Args
) => Effect.Effect<readonly PromptMessage[], JsonRpcError, never>;

type PromptImpl<Args extends Schema.Struct.Fields> = {
  name: string;
  description: string;
  arguments: Args;
  handler: PromptHandler<Args>;
};

type PromptImplAny = PromptImpl<any>;

export const TypeId: unique symbol = Symbol.for("@effect-mcp/server/PromptKit");

export type TypeId = typeof TypeId;

export interface PromptKit<in out Prompts extends PromptImplAny>
  extends Inspectable.Inspectable,
    Pipeable {
  readonly [TypeId]: TypeId;
  readonly prompts: HashMap.HashMap<string, PromptImplAny>;
  readonly add: <S extends PromptImplAny>(prompt: S) => PromptKit<Prompts | S>;
  readonly addAll: <ToAdd extends ReadonlyArray<PromptImplAny>>(
    ...prompts: ToAdd
  ) => PromptKit<Prompts | ToAdd[number]>;
  readonly concat: <P extends PromptImplAny>(
    that: PromptKit<P>
  ) => PromptKit<Prompts | P>;
}

class PromptKitImpl<Prompts extends PromptImplAny>
  implements PromptKit<Prompts>
{
  readonly [TypeId]: TypeId;
  constructor(readonly prompts: HashMap.HashMap<string, PromptImplAny>) {
    this[TypeId] = TypeId;
  }

  toJSON(): unknown {
    return {
      _id: "@effect-mcp/server/PromptKit",
      prompts: [...HashMap.values(this.prompts)].map((prompt) => prompt.name),
    };
  }
  toString(): string {
    return Inspectable.format(this);
  }
  [Inspectable.NodeInspectSymbol](): string {
    return Inspectable.format(this);
  }

  pipe() {
    return pipeArguments(this, arguments);
  }

  add<S extends PromptImplAny>(prompt: S): PromptKit<Prompts | S> {
    return new PromptKitImpl<Prompts | S>(
      HashMap.set(this.prompts, prompt.name, prompt)
    );
  }

  addAll<ToAdd extends ReadonlyArray<PromptImplAny>>(
    ...prompts: ToAdd
  ): PromptKit<Prompts | ToAdd[number]> {
    let map = this.prompts;

    for (const prompt of prompts) {
      map = HashMap.set(map, prompt.name, prompt);
    }

    return new PromptKitImpl<Prompts | ToAdd[number]>(map);
  }

  concat<P extends PromptImplAny>(that: PromptKit<P>): PromptKit<Prompts | P> {
    return new PromptKitImpl<Prompts | P>(
      HashMap.union(this.prompts, that.prompts)
    );
  }
}

export const empty: PromptKit<never> = new PromptKitImpl<never>(
  HashMap.empty()
);
