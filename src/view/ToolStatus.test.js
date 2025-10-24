import React from "react";
import { render, screen } from "@testing-library/react";
import ToolStatus from "./ToolStatus";

describe("ToolStatus", () => {
  test("shows cursor when no tool-specific state", () => {
    render(
      <ToolStatus
        selectedTool="draw"
        toolStateRef={{ current: {} }}
        cursorCell={{ x: 5, y: 7 }}
      />,
    );
    expect(screen.getByText(/Cursor:/)).toHaveTextContent("Cursor: 5,7");
  });

  test("formats line tool start/end/delta", () => {
    const ref = { current: { start: { x: 1, y: 2 }, last: { x: 4, y: 6 } } };
    render(
      <ToolStatus selectedTool="line" toolStateRef={ref} cursorCell={null} />,
    );
    expect(screen.getByText(/Start:/)).toHaveTextContent("Start: 1,2");
    expect(screen.getByText(/End:/)).toHaveTextContent("End: 4,6");
    expect(screen.getByText(/Δ:/)).toHaveTextContent("Δ: 3,4");
  });

  test("handles missing start gracefully", () => {
    const ref = { current: { last: { x: 3, y: 3 } } };
    render(
      <ToolStatus
        selectedTool="line"
        toolStateRef={ref}
        cursorCell={{ x: 3, y: 3 }}
      />,
    );
    expect(screen.getByText(/Start:/)).toHaveTextContent("Start: —");
    expect(screen.getByText(/End:/)).toHaveTextContent("End: 3,3");
  });
});
