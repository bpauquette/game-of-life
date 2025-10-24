import { act } from "@testing-library/react";

// Returns a function suitable for passing to expect(...).not.toThrow()
// It will call the supplied callback inside React's act wrapper.
export const actFn = (cb) => () => act(() => cb());

const TestHelpers = { actFn };
export default TestHelpers;
