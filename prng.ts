import seedrandom from "seedrandom";

export class PrngState {
  constructor(public state: any) {}
}

export class Prng {
  rng: any;

  constructor(seed: string | PrngState) {
    if (seed instanceof PrngState) {
      this.rng = new seedrandom("", { state: seed.state });
    } else {
      this.rng = new seedrandom(seed, { state: true });
    }
  }

  randint(l: number, r: number): number {
    return l + (this.rng.int32() % (r - l + 1));
  }

  state(): PrngState {
    return new PrngState(this.rng.state());
  }

  choice1<T>(ls: T[]): T {
    if (ls.length == 0) {
      throw new Error("random choice of a collection of 0 elements");
    }
    const idx = this.randint(0, ls.length - 1);
    const chosen = ls[idx];
    return chosen;
  }

  choice2<T>(ls: T[]): {
    chosen: T;
    rest: T[];
  } {
    if (ls.length == 0) {
      throw new Error("random choice of a collection of 0 elements");
    }
    const idx = this.randint(0, ls.length - 1);
    const chosen = ls[idx];
    const rest = ls.slice();
    rest[idx] = rest.pop()!;
    return {
      chosen,
      rest,
    };
  }
}
