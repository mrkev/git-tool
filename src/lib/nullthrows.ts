export function nullthrows<T>(val: T | null | undefined, msg: string): T {
  if (val == null) {
    throw new Error(msg);
  }
  return val;
}
