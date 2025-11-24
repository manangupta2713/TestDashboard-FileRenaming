import { vi, describe, expect, it, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OpsConsole, { OpsConsoleProvider } from "../../src/components/OpsConsole";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockPreviewFiles = [
  { original: "one.txt", new: "hello-one.txt" },
  { original: "two.txt", new: "hello-two.txt" },
];

describe("OpsConsole preview + selective run", () => {
  beforeEach(() => {
    axios.post.mockReset();
    axios.post.mockImplementation((url, body) => {
      if (url.endsWith("/preview") && body.operations.length === 0) {
        return Promise.resolve({
          data: {
            files: [
              { original: "one.txt", new: "one.txt" },
              { original: "two.txt", new: "two.txt" },
            ],
            summary: { renamed: 0, unchanged: 2, collisions: 0 },
          },
        });
      }
      if (url.endsWith("/preview")) {
        return Promise.resolve({
          data: {
            files: mockPreviewFiles,
            summary: { renamed: 2, unchanged: 0, collisions: 0 },
          },
        });
      }
      if (url.endsWith("/run")) {
        return Promise.resolve({
          data: {
            files: mockPreviewFiles.filter((file) =>
              body.include_files ? body.include_files.includes(file.original) : true
            ),
            summary: { renamed: body.include_files?.length || 0, unchanged: 0, collisions: 0 },
          },
        });
      }
      throw new Error(`Unexpected axios call to ${url}`);
    });
  });

  it("requires a loaded folder before previewing or running", async () => {
    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    await user.click(screen.getByRole("button", { name: /^Preview$/i }));
    expect(axios.post).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^Run$/i }));
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("requires at least one configured operation before running", async () => {
    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    const folderInput = screen.getByPlaceholderText(/Working/i);
    await user.type(folderInput, "D:\\Samples");
    await user.click(screen.getByRole("button", { name: /Check & Load/i }));
    await screen.findByText(/Connected/i);

    const callCount = axios.post.mock.calls.length;
    await user.click(screen.getByRole("button", { name: /^Run$/i }));
    expect(axios.post.mock.calls.length).toBe(callCount);
  });

  it("allows deselecting preview rows and forwards include_files to run", async () => {
    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    const folderInput = screen.getAllByPlaceholderText(/Working/i)[0];
    await user.type(folderInput, "D:\\Samples");
    await user.click(screen.getByRole("button", { name: /Check & Load/i }));
    await screen.findByText(/Connected/i);

    const prefixInput = screen.getAllByPlaceholderText("Prefix text...")[0];
    await user.type(prefixInput, "hello");
    const prefixRow = screen.getByText(/Add prefix/i).parentElement;
    const stepOneButton = within(prefixRow).getByRole("button", { name: "1" });
    await user.click(stepOneButton);

    await user.click(screen.getByRole("button", { name: /^Preview$/i }));

    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row");
    const firstRow = rows[1];
    const secondRow = rows[2];
    const firstCheckbox = within(firstRow).getByRole("checkbox");
    expect(firstCheckbox).toBeChecked();
    await user.click(firstCheckbox);
    await within(firstRow).findByText(/Skipped/i);

    const secondCheckbox = within(secondRow).getByRole("checkbox");
    expect(secondCheckbox).toBeChecked();

    await user.click(screen.getByRole("button", { name: /^Run$/i }));
    await waitFor(() => {
      const runCall = axios.post.mock.calls.find(([url]) => url.endsWith("/run"));
      expect(runCall).toBeTruthy();
    });
    const runCall = axios.post.mock.calls.find(([url]) => url.endsWith("/run"));
    expect(runCall[1].include_files).toEqual(["two.txt"]);
  });

  it("supports toggling the select-all checkbox", async () => {
    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    const folderInput = screen.getByPlaceholderText(/Working/i);
    await user.type(folderInput, "D:\\Samples");
    await user.click(screen.getByRole("button", { name: /Check & Load/i }));
    await screen.findByText(/Connected/i);

    const prefixInput = screen.getAllByPlaceholderText("Prefix text...")[0];
    await user.type(prefixInput, "hello");
    const prefixRow = screen.getByText(/Add prefix/i).parentElement;
    const stepOneButton = within(prefixRow).getByRole("button", { name: "1" });
    await user.click(stepOneButton);

    await user.click(screen.getByRole("button", { name: /^Preview$/i }));
    const selectAll = await screen.findByLabelText(/Select all files/i);
    expect(selectAll).toBeChecked();

    await user.click(selectAll);
    expect(selectAll).not.toBeChecked();
    expect(screen.getByLabelText("Toggle one.txt")).not.toBeChecked();
    expect(screen.getByLabelText("Toggle two.txt")).not.toBeChecked();

    await user.click(selectAll);
    expect(screen.getByLabelText("Toggle one.txt")).toBeChecked();
    expect(screen.getByLabelText("Toggle two.txt")).toBeChecked();
  });

  it("blocks the run when every preview row is deselected", async () => {
    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    const folderInput = screen.getByPlaceholderText(/Working/i);
    await user.type(folderInput, "D:\\Samples");
    await user.click(screen.getByRole("button", { name: /Check & Load/i }));
    await screen.findByText(/Connected/i);

    const prefixInput = screen.getAllByPlaceholderText("Prefix text...")[0];
    await user.type(prefixInput, "astro");
    const prefixRow = screen.getByText(/Add prefix/i).parentElement;
    const stepOneButton = within(prefixRow).getByRole("button", { name: "1" });
    await user.click(stepOneButton);

    await user.click(screen.getByRole("button", { name: /^Preview$/i }));
    const selectAll = await screen.findByLabelText(/Select all files/i);
    await user.click(selectAll);

    await user.click(screen.getByRole("button", { name: /^Run$/i }));

    expect(await screen.findByText(/Run aborted: no files selected/i)).toBeInTheDocument();
    expect(
      axios.post.mock.calls.some(([url]) => url.endsWith("/run"))
    ).toBe(false);
  });

  it("shows a preview error when the backend returns 404", async () => {
    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    const folderInput = screen.getByPlaceholderText(/Working/i);
    await user.type(folderInput, "E:\\Ghost");
    await user.click(screen.getByRole("button", { name: /Check & Load/i }));
    await screen.findByText(/Connected/i);

    const prefixInput = screen.getAllByPlaceholderText("Prefix text...")[0];
    await user.type(prefixInput, "astro");
    const prefixRow = screen.getByText(/Add prefix/i).parentElement;
    const stepOneButton = within(prefixRow).getByRole("button", { name: "1" });
    await user.click(stepOneButton);

    axios.post.mockImplementationOnce(() =>
      Promise.reject({ response: { status: 404 } })
    );

    await user.click(screen.getByRole("button", { name: /^Preview$/i }));
    expect(
      await screen.findByText(/Folder not found while previewing/i)
    ).toBeInTheDocument();
  });

  it("shows a run error when the backend rejects the rename", async () => {
    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    const folderInput = screen.getByPlaceholderText(/Working/i);
    await user.type(folderInput, "D:\\Samples");
    await user.click(screen.getByRole("button", { name: /Check & Load/i }));
    await screen.findByText(/Connected/i);

    const prefixInput = screen.getAllByPlaceholderText("Prefix text...")[0];
    await user.type(prefixInput, "astro");
    const prefixRow = screen.getByText(/Add prefix/i).parentElement;
    const stepOneButton = within(prefixRow).getByRole("button", { name: "1" });
    await user.click(stepOneButton);

    await user.click(screen.getByRole("button", { name: /^Preview$/i }));
    await screen.findByRole("table");

    axios.post.mockImplementationOnce(() =>
      Promise.reject({ response: { status: 404 } })
    );

    await user.click(screen.getByRole("button", { name: /^Run$/i }));
    expect(
      await screen.findByText(/Run error: folder not found/i)
    ).toBeInTheDocument();
  });

  it("reports run success for selected files when backend omits summary", async () => {
    axios.post.mockImplementation((url, body) => {
      if (url.endsWith("/preview") && body.operations.length === 0) {
        return Promise.resolve({
          data: {
            files: [
              { original: "one.txt", new: "one.txt" },
              { original: "two.txt", new: "two.txt" },
            ],
            summary: { renamed: 0, unchanged: 2, collisions: 0 },
          },
        });
      }
      if (url.endsWith("/preview")) {
        return Promise.resolve({
          data: {
            files: mockPreviewFiles,
            summary: { renamed: 2, unchanged: 0, collisions: 0 },
          },
        });
      }
      if (url.endsWith("/run")) {
        return Promise.resolve({
          data: {
            files: mockPreviewFiles,
          },
        });
      }
      throw new Error(`Unexpected axios call to ${url}`);
    });

    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    const folderInput = screen.getByPlaceholderText(/Working/i);
    await user.type(folderInput, "D:\\Samples");
    await user.click(screen.getByRole("button", { name: /Check & Load/i }));
    await screen.findByText(/Connected/i);

    const prefixInput = screen.getAllByPlaceholderText("Prefix text...")[0];
    await user.type(prefixInput, "astro");
    const prefixRow = screen.getByText(/Add prefix/i).parentElement;
    const stepOneButton = within(prefixRow).getByRole("button", { name: "1" });
    await user.click(stepOneButton);

    await user.click(screen.getByRole("button", { name: /^Preview$/i }));
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: /^Run$/i }));
    expect(
      await screen.findByText(/Run completed for 2 selected files/i)
    ).toBeInTheDocument();
  });

  it("runs without preview and reports generic success", async () => {
    axios.post.mockImplementation((url, body) => {
      if (url.endsWith("/preview")) {
        return Promise.resolve({
          data: {
            files: [{ original: "sample.txt", new: "sample.txt" }],
            summary: { renamed: 0, unchanged: 1, collisions: 0 },
          },
        });
      }
      if (url.endsWith("/run")) {
        return Promise.resolve({ data: {} });
      }
      throw new Error(`Unexpected axios call to ${url}`);
    });

    const user = userEvent.setup();
    render(
      <OpsConsoleProvider>
        <OpsConsole />
      </OpsConsoleProvider>
    );

    const folderInput = screen.getByPlaceholderText(/Working/i);
    await user.type(folderInput, "D:\\Samples");
    await user.click(screen.getByRole("button", { name: /Check & Load/i }));
    await screen.findByText(/Connected/i);

    const prefixInput = screen.getAllByPlaceholderText("Prefix text...")[0];
    await user.type(prefixInput, "astro");
    const prefixRow = screen.getByText(/Add prefix/i).parentElement;
    const stepOneButton = within(prefixRow).getByRole("button", { name: "1" });
    await user.click(stepOneButton);

    // Skip preview entirely and run directly
    await user.click(screen.getByRole("button", { name: /^Run$/i }));

    const successMessages = await screen.findAllByText(/Run completed\./i);
    expect(successMessages.length).toBeGreaterThan(0);
  });
});
