export function evalThunk<T>(thunk: () => T): T {
  return thunk();
}

export enum PromiseState {
  Pending,
  Resolved,
  Rejected,
}

type PromiseSync<T> =
  | {
      state: PromiseState.Pending;
    }
  | {
      state: PromiseState.Resolved;
      value: T;
    }
  | {
      state: PromiseState.Rejected;
      reason?: any;
    };

export interface Deferred<T> {
  promise: Promise<T>;
  getSync(): PromiseSync<T>;
  resolve(value: T): void;
  reject(reason?: any): void;
}

class DeferredImpl<T> implements Deferred<T> {
  promise: Promise<T>;
  valueIfResolved: T | null;
  reasonIfRejected: { reason: any } | null;
  resolvePromise!: Deferred<T>["resolve"];
  rejectPromise!: Deferred<T>["reject"];

  public constructor() {
    this.promise = new Promise<T>((res, rej) => {
      this.resolvePromise = res;
      this.rejectPromise = rej;
    });
    this.valueIfResolved = null;
    this.reasonIfRejected = null;
  }

  public getSync = (): PromiseSync<T> => {
    if (this.valueIfResolved !== null) {
      return {
        state: PromiseState.Resolved,
        value: this.valueIfResolved,
      };
    }
    if (this.reasonIfRejected !== null) {
      return {
        state: PromiseState.Rejected,
        ...this.reasonIfRejected,
      };
    }
    return {
      state: PromiseState.Pending,
    };
  };

  public resolve = (value: T): void => {
    this.valueIfResolved = value;
    this.resolvePromise(value);
  };

  public reject = (reason?: any): void => {
    this.reasonIfRejected = { reason };
    this.rejectPromise(reason);
  };
}

export function createDeferred<T>(): Deferred<T> {
  return new DeferredImpl();
}
