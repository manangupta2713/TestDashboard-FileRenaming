import { describe, it, beforeEach, expect, vi } from "vitest";
import React from "react";

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({
  render: renderMock,
}));

vi.mock("react-dom/client", () => ({
  createRoot: createRootMock,
}));

vi.mock("../../src/App.jsx", () => ({
  default: () => React.createElement("div", { "data-testid": "mock-app" }, "Mock App"),
}));

describe("main entrypoint", () => {
  beforeEach(() => {
    renderMock.mockClear();
    createRootMock.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("mounts the React app into #root", async () => {
    await import("../../src/main.jsx");
    const rootElement = document.getElementById("root");
    expect(createRootMock).toHaveBeenCalledWith(rootElement);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
