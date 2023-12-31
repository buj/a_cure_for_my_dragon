import seedrandom from "seedrandom";
import { evalThunk } from "./utils";

export type Prompt<T> = {
  context: T;
  key: string;
};

export interface IInput<Q> {
  chooseFromRange(prompt: Prompt<Q>, l: number, r: number): Promise<number>;
  chooseFromList<T>(prompt: Prompt<Q>, ls: T[]): Promise<T>;
}

export namespace IInput {
  export async function chooseFromListWithoutReplacement<T, Q>(
    input: IInput<Q>,
    prompt: Prompt<Q>,
    ls: T[]
  ): Promise<{
    chosen: T;
    rest: T[];
  }> {
    const value = await input.chooseFromList(prompt, ls);
    const idx = ls.indexOf(value);
    return {
      chosen: value,
      rest: [...ls.slice(0, idx), ...ls.slice(idx + 1)],
    };
  }
}

export interface IRecorded {
  getHistory(): Record<string, number>;
}

export class RecordedInput<Q> implements IInput<Q> {
  public constructor(
    private fallback: IInput<Q>,
    private recording: Record<string, number>
  ) {}

  public chooseFromRange(
    prompt: Prompt<Q>,
    l: number,
    r: number
  ): Promise<number> {
    if (prompt.key in this.recording) {
      const result = this.recording[prompt.key]!;
      if (result < l || result > r) {
        throw new Error("recording does not satisfy input constraints");
      }
      return Promise.resolve(result);
    }
    return this.fallback.chooseFromRange(prompt, l, r);
  }

  public async chooseFromList<T>(prompt: Prompt<Q>, ls: T[]): Promise<T> {
    const idx = await this.chooseFromRange(prompt, 0, ls.length - 1);
    return ls[idx]!;
  }
}

export class ControlledInput<Q> implements IInput<Q> {
  public constructor(
    private source: IInput<Q>,
    private controller: IPlayer<
      { type: "keepOrReroll"; rngCtx: Q; value: any },
      { type: "reroll"; rngCtx: Q }
    >
  ) {}

  chooseFromRangeMapped: <T>(
    prompt: Prompt<Q>,
    l: number,
    r: number,
    mapping: (i: number) => T
  ) => Promise<T> = async (prompt, l, r, mapping) => {
    const srcChoice = await this.source.chooseFromRange(
      {
        context: prompt.context,
        key: JSON.stringify([prompt.key, 0]),
      },
      l,
      r
    );
    const reroll = await this.controller.chooseFromList(
      {
        context: {
          type: "keepOrReroll",
          rngCtx: prompt.context,
          value: mapping(srcChoice),
        },
        key: prompt.key,
      },
      [false, true]
    );

    if (reroll) {
      const rerolled = await this.source.chooseFromRange(
        {
          context: prompt.context,
          key: JSON.stringify([prompt.key, 1]),
        },
        l,
        r
      );
      this.controller.show(
        {
          context: {
            type: "reroll",
            rngCtx: prompt.context,
          },
          key: prompt.key,
        },
        mapping(rerolled)
      );
      return mapping(rerolled);
    } else {
      return mapping(srcChoice);
    }
  };

  public chooseFromRange = async (
    prompt: Prompt<Q>,
    l: number,
    r: number
  ): Promise<number> => {
    return this.chooseFromRangeMapped(prompt, l, r, (i) => i);
  };

  public chooseFromList = async <T>(prompt: Prompt<Q>, ls: T[]): Promise<T> => {
    return this.chooseFromRangeMapped(prompt, 0, ls.length - 1, (i) => ls[i]!);
  };
}

export interface IOutput<S> {
  show<T>(prompt: Prompt<S>, value: T): void;
}

export interface IPlayer<Q, S> extends IInput<Q>, IOutput<S> {}

export class PrngState {
  constructor(public state: any) {}
}

export class Prng<Q> implements IInput<Q> {
  rng: seedrandom.StatefulPRNG<seedrandom.State.Arc4>;
  history: Record<string, number>;

  public constructor(seed: string | PrngState) {
    if (seed instanceof PrngState) {
      this.rng = seedrandom("", { state: seed.state });
    } else {
      this.rng = seedrandom(seed, { state: true });
    }
    this.history = {};
  }

  public getHistory = (): Record<string, number> => {
    return this.history;
  };

  public chooseFromRange = (
    prompt: Prompt<Q>,
    l: number,
    r: number
  ): Promise<number> => {
    if (r < l) {
      throw new Error("random choice from empty range");
    }
    const modulus = r - l + 1;
    const roll = evalThunk(() => {
      const tmp = this.rng.int32() % modulus;
      if (tmp < 0) {
        return modulus + tmp;
      } else {
        return tmp;
      }
    });
    const result = l + roll;
    this.history[prompt.key] = result;
    return Promise.resolve(result);
  };

  public chooseFromList = async <T>(prompt: Prompt<Q>, ls: T[]): Promise<T> => {
    const idx = await this.chooseFromRange(prompt, 0, ls.length - 1);
    return ls[idx]!;
  };

  public state = (): PrngState => {
    return new PrngState(this.rng.state());
  };
}
