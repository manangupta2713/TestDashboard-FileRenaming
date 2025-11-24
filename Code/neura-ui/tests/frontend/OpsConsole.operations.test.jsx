import { describe, it, beforeEach, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OpsConsole, { OpsConsoleProvider } from "../../src/components/OpsConsole";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("OpsConsole operations grid", () => {
  beforeEach(() => {
    axios.post.mockReset();
    window.localStorage.clear();
  });

  it("auto-assigns steps, collapses gaps, and swaps ordering", async () => {
    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    const prefixInput = screen.getAllByPlaceholderText("Prefix text...")[0];
    await user.type(prefixInput, "astro");
    const prefixRow = screen.getByText(/Add prefix/i).parentElement;

    const suffixInput = screen.getAllByPlaceholderText("Suffix text...")[0];
    await user.type(suffixInput, "dash");
    const suffixRow = screen.getByText(/Add suffix/i).parentElement;

    expect(within(prefixRow).getByRole("button", { name: "1" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(within(suffixRow).getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await user.clear(prefixInput);
    expect(
      within(prefixRow).getByRole("button", { name: "1" })
    ).toHaveAttribute("aria-pressed", "false");
    expect(within(suffixRow).getByRole("button", { name: "1" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await user.type(prefixInput, "astro");
    expect(within(prefixRow).getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await user.click(within(prefixRow).getByRole("button", { name: "1" }));
    expect(within(prefixRow).getByRole("button", { name: "1" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(within(suffixRow).getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("shows a step hint when clicking a step on an empty row", async () => {
    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    const prefixRow = screen.getByText(/Add prefix/i).parentElement;
    await user.click(within(prefixRow).getByRole("button", { name: "1" }));

    expect(await screen.findByText(/No prefix added/i)).toBeInTheDocument();
  });
});
