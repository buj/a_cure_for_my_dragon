import seedrandom from "seedrandom";

export type Prompt = {
  context: string | object;
  key: string;
};

export interface IInput {
  chooseFromRange(prompt: Prompt, l: number, r: number): Promise<number>;
  chooseFromList<T>(prompt: Prompt, ls: T[]): Promise<T>;
}

export namespace IInput {
  export async function chooseFromListWithoutReplacement<T>(
    input: IInput,
    prompt: Prompt,
    ls: T[]
  ): Promise<{
    chosen: T;
    rest: T[];
  }> {
    const idx = await input.chooseFromRange(prompt, 0, ls.length - 1);
    return {
      chosen: ls[idx],
      rest: [...ls.slice(0, idx), ...ls.slice(idx + 1)],
    };
  }
}

export interface IRecorded {
  getHistory(): Record<string, number>;
}

export class RecordedInput {
  fallback: IInput;
  recording: Record<string, number>;

  public chooseFromRange(
    prompt: Prompt,
    l: number,
    r: number
  ): Promise<number> {
    if (prompt.key in this.recording) {
      const result = this.recording[prompt.key];
      if (result < l || result > r) {
        throw new Error("recording does not satisfy input constraints");
      }
      return Promise.resolve(result);
    }
    return this.fallback.chooseFromRange(prompt, l, r);
  }

  public async chooseFromList<T>(prompt: Prompt, ls: T[]): Promise<T> {
    const idx = await this.chooseFromRange(prompt, 0, ls.length - 1);
    return ls[idx];
  }
}

export class ControlledInput {
  source: IInput;
  controller: IInput;

  public constructor(source: IInput, controller: IInput) {
    this.source = source;
    this.controller = controller;
  }

  public async chooseFromRange(
    prompt: Prompt,
    l: number,
    r: number
  ): Promise<number> {
    const srcChoice = this.source.chooseFromRange(
      {
        context: prompt.context,
        key: JSON.stringify([prompt.key, 0]),
      },
      l,
      r
    );
    const keep = await this.controller.chooseFromList(
      {
        context: {
          0: "keepOrReroll",
          1: prompt.context,
        },
        key: prompt.key,
      },
      [false, true]
    );

    if (keep) {
      return srcChoice;
    } else {
      return this.source.chooseFromRange(
        {
          context: prompt.context,
          key: JSON.stringify([prompt.key, 1]),
        },
        l,
        r
      );
    }
  }

  public async chooseFromList<T>(prompt: Prompt, ls: T[]): Promise<T> {
    const idx = await this.chooseFromRange(prompt, 0, ls.length - 1);
    return ls[idx];
  }
}

export interface IOutput {
  show<T>(prompt: Prompt, value: T);
}

export interface IPlayer extends IInput, IOutput {}

export class PrngState {
  constructor(public state: any) {}
}

export class Prng {
  rng: any;
  history: Record<string, number>;

  public constructor(seed: string | PrngState) {
    if (seed instanceof PrngState) {
      this.rng = seedrandom("", { state: seed.state });
    } else {
      this.rng = seedrandom(seed, { state: true });
    }
    this.history = {};
  }

  public getHistory(): Record<string, number> {
    return this.history;
  }

  public chooseFromRange(
    prompt: Prompt,
    l: number,
    r: number
  ): Promise<number> {
    if (r < l) {
      throw new Error("random choice from empty range");
    }
    const result = l + (this.rng.int32() % (r - l + 1));
    this.history[prompt.key] = result;
    return Promise.resolve(result);
  }

  public async chooseFromList<T>(prompt: Prompt, ls: T[]): Promise<T> {
    const idx = await this.chooseFromRange(prompt, 0, ls.length - 1);
    return ls[idx];
  }

  public state(): PrngState {
    return new PrngState(this.rng.state());
  }
}
