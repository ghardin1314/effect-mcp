import * as Context from "effect/Context";
import * as HashMap from "effect/HashMap";
import * as Inspectable from "effect/Inspectable";
import * as Layer from "effect/Layer";
import { pipeArguments, type Pipeable } from "effect/Pipeable";
import * as Prompt from "./prompt.js";

export const TypeId: unique symbol = Symbol.for("@effect-mcp/server/PromptKit");

export type TypeId = typeof TypeId;

export class Registry extends Context.Tag(
  "@effect-mcp/server/PromptKit/Registry"
)<Registry, HashMap.HashMap<string, Prompt.Prompt.Any>>() {
  static readonly Live: Layer.Layer<Registry> = Layer.sync(Registry, () =>
    HashMap.empty()
  );
}

export interface PromptKit<in out Prompts extends Prompt.Prompt.Any, R>
  extends Inspectable.Inspectable,
    Pipeable {
  readonly [TypeId]: TypeId;
  readonly prompts: HashMap.HashMap<string, Prompt.Prompt.Any>;
  readonly add: <S extends Prompt.Prompt.Any>(
    prompt: S
  ) => PromptKit<Prompts | S, R | Prompt.Prompt.Context<S>>;
  readonly addAll: <ToAdd extends ReadonlyArray<Prompt.Prompt.Any>>(
    ...prompts: ToAdd
  ) => PromptKit<
    Prompts | ToAdd[number],
    R | Prompt.Prompt.Context<ToAdd[number]>
  >;
  readonly concat: <P extends Prompt.Prompt.Any>(
    that: PromptKit<P, R>
  ) => PromptKit<Prompts | P, R | Prompt.Prompt.Context<P>>;
  readonly finalize: () => Layer.Layer<Registry, R>;
}

class PromptKitImpl<Prompts extends Prompt.Prompt.Any, R>
  implements PromptKit<Prompts, R>
{
  readonly [TypeId]: TypeId;
  constructor(readonly prompts: HashMap.HashMap<string, Prompt.Prompt.Any>) {
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

  add<S extends Prompt.Prompt.Any>(
    prompt: S
  ): PromptKit<Prompts | S, R | Prompt.Prompt.Context<S>> {
    return new PromptKitImpl<Prompts | S, R | Prompt.Prompt.Context<S>>(
      HashMap.set(this.prompts, prompt.name, prompt)
    );
  }

  addAll<ToAdd extends ReadonlyArray<Prompt.Prompt.Any>>(
    ...prompts: ToAdd
  ): PromptKit<
    Prompts | ToAdd[number],
    R | Prompt.Prompt.Context<ToAdd[number]>
  > {
    let map = this.prompts;

    for (const prompt of prompts) {
      map = HashMap.set(map, prompt.name, prompt);
    }

    return new PromptKitImpl<
      Prompts | ToAdd[number],
      R | Prompt.Prompt.Context<ToAdd[number]>
    >(map);
  }

  concat<P extends Prompt.Prompt.Any>(
    that: PromptKit<P, R>
  ): PromptKit<Prompts | P, R | Prompt.Prompt.Context<P>> {
    return new PromptKitImpl<Prompts | P, R | Prompt.Prompt.Context<P>>(
      HashMap.union(this.prompts, that.prompts)
    );
  }

  finalize(): Layer.Layer<Registry, R> {
    return Layer.succeed(Registry, this.prompts);
  }
}

export const empty: PromptKit<never, never> = new PromptKitImpl<never, never>(
  HashMap.empty()
);
