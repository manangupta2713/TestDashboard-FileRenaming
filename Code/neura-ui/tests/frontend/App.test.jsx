import { describe, it, beforeEach, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.jsx";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("App dashboard switcher", () => {
  beforeEach(() => {
    axios.post.mockReset();
    window.localStorage.clear();
  });

  it("shows the rename dashboard by default", () => {
    render(<App />);
    expect(
      screen.getByText(/NeuraMax Smart Renamer/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Workspace/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Check & Load/i })).toBeInTheDocument();
  });

  it("switches to the dataset actions dashboard", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Dataset Actions/i }));

    expect(
      screen.getByText(/NeuraMax Dataset Agent/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/CHOOSE OPERATION/i)).toBeInTheDocument();
  });
});
