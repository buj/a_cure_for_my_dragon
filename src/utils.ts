export function evalThunk<T>(thunk: () => T): T {
  return thunk();
}
