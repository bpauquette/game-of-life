const noop = () => undefined;

export function decode() {
  return undefined;
}

export const sign = noop;
export const verify = noop;

const jwtApi = { decode, sign, verify };

export default jwtApi;
