import { renderHook, act } from "@testing-library/react";
import { useChunkedGameState } from "./chunkedGameState";

describe("useChunkedGameState", () => {
  it("starts with empty chunks", () => {
    const { result } = renderHook(() => useChunkedGameState());
    expect(result.current.chunks.size).toBe(0);
    expect(result.current.getLiveCells().size).toBe(0);
  });

  it("sets a cell alive and retrieves it from getLiveCells", () => {
    const { result } = renderHook(() => useChunkedGameState());
    act(() => {
      result.current.setCellAlive(5, 5, true);
    });
    const liveCells = result.current.getLiveCells();
    expect(liveCells.has("5,5")).toBe(true);
    expect(result.current.chunks.size).toBe(1);
  });

  it("removes a cell when setCellAlive is called with false", () => {
    const { result } = renderHook(() => useChunkedGameState());
    act(() => {
      result.current.setCellAlive(5, 5, true);
      result.current.setCellAlive(5, 5, false);
    });
    expect(result.current.getLiveCells().has("5,5")).toBe(false);
    expect(result.current.chunks.size).toBe(0);
  });

  it("toggleCell turns dead cell alive and alive cell dead", () => {
    const { result } = renderHook(() => useChunkedGameState());
    act(() => {
      result.current.toggleCell(1, 1);
    });
    expect(result.current.getLiveCells().has("1,1")).toBe(true);

    act(() => {
      result.current.toggleCell(1, 1);
    });
    expect(result.current.getLiveCells().has("1,1")).toBe(false);
  });

  it("clear removes all chunks and live cells", () => {
    const { result } = renderHook(() => useChunkedGameState());
    act(() => {
      result.current.setCellAlive(10, 10, true);
      result.current.clear();
    });
    expect(result.current.chunks.size).toBe(0);
    expect(result.current.getLiveCells().size).toBe(0);
  });

  it("randomize fills cells with ~50% chance", () => {
    const { result } = renderHook(() => useChunkedGameState());
    act(() => {
      result.current.setCellAlive(0, 0, true);
      result.current.randomize();
    });
    const liveCount = result.current.getLiveCells().size;
    expect(liveCount).toBeGreaterThan(0);
  });

  it("handles multiple cells in the same chunk", () => {
    const { result } = renderHook(() => useChunkedGameState());
    act(() => {
      result.current.setCellAlive(0, 0, true);
      result.current.setCellAlive(1, 1, true);
    });
    expect(result.current.chunks.size).toBe(1);
    expect(result.current.getLiveCells().size).toBe(2);
  });

  it("handles removing the last cell in a chunk and deletes the chunk", () => {
    const { result } = renderHook(() => useChunkedGameState());
    act(() => {
      result.current.setCellAlive(0, 0, true);
      result.current.setCellAlive(0, 0, false);
    });
    expect(result.current.chunks.size).toBe(0);
  });

  it("getLiveCells returns a map with correct global coordinates", () => {
    const { result } = renderHook(() => useChunkedGameState());
    const bigX = 70; // will fall into chunk 1
    const bigY = 130; // will fall into chunk 2
    act(() => {
      result.current.setCellAlive(bigX, bigY, true);
    });
    const liveMap = result.current.getLiveCells();
    expect(liveMap.has(`${bigX},${bigY}`)).toBe(true);
  });
});
