import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OpsConsole, { OpsConsoleProvider } from "../../src/components/OpsConsole";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

const renderConsole = () =>
  render(
    <OpsConsoleProvider>
      <OpsConsole />
    </OpsConsoleProvider>
  );

describe("OpsConsole workspace basics", () => {
  beforeEach(() => {
    axios.post.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    delete navigator.clipboard;
  });

  it("shows an error when checking a folder without a path", async () => {
    const user = userEvent.setup();
    renderConsole();
    await user.click(screen.getByRole("button", { name: /Check & Load/i }));
    expect(
      await screen.findByText("Paste or type a folder path first.")
    ).toBeInTheDocument();
  });

  it("pastes from clipboard and loads the folder count", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue("D:\\Assets"),
      },
    });

    axios.post.mockResolvedValueOnce({
      data: {
        files: [{ original: "file.txt", new: "file.txt" }],
        summary: { renamed: 0, unchanged: 1, collisions: 0 },
      },
    });

    renderConsole();
    await user.click(screen.getAllByRole("button", { name: /Use clipboard/i })[0]);
    expect(
      await screen.findByText(/Pasted from clipboard/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Check & Load/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/preview",
        {
          folder: "D:\\Assets",
          operations: [],
        }
      );
    });
    expect(
      await screen.findByText(/Connected · 1 file/i)
    ).toBeInTheDocument();
  });
});
