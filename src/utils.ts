export function evalThunk<T>(thunk: () => T): T {
  return thunk();
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export function createDeferred<T>(): Deferred<T> {
  let resolve: Deferred<T>["resolve"];
  let reject: Deferred<T>["reject"];

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}
