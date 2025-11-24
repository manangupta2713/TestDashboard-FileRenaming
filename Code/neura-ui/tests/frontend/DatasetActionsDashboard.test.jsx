import { describe, it, beforeEach, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";

import DatasetActionsDashboard from "../../src/dataset/DatasetActionsDashboard.jsx";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockEntries = [
  {
    id: "caption1.txt",
    path: "/tmp/dataset/caption1.txt",
    filename: "caption1.txt",
    caption: "pose",
  },
  {
    id: "caption2.txt",
    path: "/tmp/dataset/caption2.txt",
    filename: "caption2.txt",
    caption: "walk",
  },
];

const mockPreviewRows = [
  { id: "caption1.txt", filename: "caption1.txt", caption: "pose", preview: "pose remix" },
  { id: "caption2.txt", filename: "caption2.txt", caption: "walk", preview: "walk remix" },
];

const ALL_IMG_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"];

describe("DatasetActionsDashboard", () => {
  beforeEach(() => {
    axios.post.mockReset();
    window.localStorage.clear();
  });

  it("runs the caption atelier flow with filtering", async () => {
    axios.post.mockImplementation((url, body) => {
      if (url.endsWith("/dataset/captions/load")) {
        expect(body.folder).toBe("/tmp/dataset");
        return Promise.resolve({
          data: { rows: mockEntries, count: mockEntries.length },
        });
      }
      if (url.endsWith("/dataset/captions/preview")) {
        expect(body.entries).toHaveLength(mockEntries.length);
        return Promise.resolve({
          data: { previews: mockPreviewRows },
        });
      }
      if (url.endsWith("/dataset/captions/run")) {
        return Promise.resolve({
          data: {
            summary: { changed: body.entries.length, skipped: 0, backups: 0 },
            log: ["ok"],
            csv_path: "/tmp/report.csv",
            snapshot_id: "abc123",
          },
        });
      }
      throw new Error(`Unexpected axios call to ${url}`);
    });

    const user = userEvent.setup();
    render(<DatasetActionsDashboard />);

    const folderInput = screen.getByLabelText(/caption folder path/i);
    await user.type(folderInput, "/tmp/dataset");
    await user.click(screen.getByRole("button", { name: /Load Folder/i }));

    const prefixInput = screen.getAllByPlaceholderText("Prefix text...")[0];
    await user.type(prefixInput, "mix");
    const stepButtons = screen.getAllByRole("button", { name: "1" });
    await user.click(stepButtons[0]);

    await user.click(screen.getByRole("button", { name: /^Preview$/i }));

    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row");
    const firstRow = rows[1];
    const secondRow = rows[2];
    const firstCheckbox = within(firstRow).getByRole("checkbox");
    const secondCheckbox = within(secondRow).getByRole("checkbox");

    expect(firstCheckbox).toBeChecked();
    expect(secondCheckbox).toBeChecked();

    await user.click(firstCheckbox);
    await user.click(screen.getByRole("button", { name: /^Run$/i }));

    await waitFor(() => {
      expect(
        axios.post.mock.calls.some(([url]) => url.endsWith("/dataset/captions/run"))
      ).toBe(true);
    });

    const runCall = axios.post.mock.calls.find(([url]) =>
      url.endsWith("/dataset/captions/run")
    );
    expect(runCall[1].entries).toHaveLength(1);
    expect(runCall[1].entries[0].id).toBe("caption2.txt");
    await screen.findByText(/Run completed/i);
  });

  it("runs caption courier with overwrite + dry-run toggles", async () => {
    axios.post.mockImplementation((url, body) => {
      if (url.endsWith("/dataset/captions/copy")) {
        expect(body).toMatchObject({
          src: "E:\\SRC",
          dest: "E:\\DEST",
          dry_run: false,
          allow_overwrite: true,
        });
        return Promise.resolve({
          data: {
            summary: { copied: 5, skipped_exist: 1, missing_in_src: 0 },
            csv_path: "copy.csv",
            log: ["copy done"],
          },
        });
      }
      throw new Error(`Unexpected axios call to ${url}`);
    });

    const user = userEvent.setup();
    render(<DatasetActionsDashboard />);

    await user.click(screen.getByRole("button", { name: "Caption Courier" }));

    await user.type(screen.getByPlaceholderText("Source folder"), "E:\\SRC");
    await user.type(screen.getByPlaceholderText("Destination folder"), "E:\\DEST");

    await user.click(screen.getByRole("button", { name: "Dry run" }));
    await user.click(screen.getByRole("button", { name: "Allow overwrite" }));

    await user.click(screen.getByRole("button", { name: /Run Copy/i }));

    await waitFor(() =>
      expect(
        axios.post.mock.calls.some(([url]) => url.endsWith("/dataset/captions/copy"))
      ).toBe(true)
    );

    expect(
      screen.getByText(/Copied 5 · Skipped 1 · Missing 0/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/copy.csv/i)).toBeInTheDocument();
    expect(screen.getByText(/copy done/i)).toBeInTheDocument();
  });

  it("runs blank txt forge with custom extension filters", async () => {
    axios.post.mockImplementation((url, body) => {
      if (url.endsWith("/dataset/captions/make_blank")) {
        expect(body).toMatchObject({
          folder: "D:\\Drops",
          recursive: false,
          dry_run: false,
        });
        expect(body.extensions).not.toContain(".png");
        return Promise.resolve({
          data: {
            summary: { created: 8, already_exists: 2 },
            csv_path: "blank.csv",
            log: ["made blanks"],
          },
        });
      }
      throw new Error(`Unexpected axios call to ${url}`);
    });

    const user = userEvent.setup();
    render(<DatasetActionsDashboard />);

    await user.click(screen.getByRole("button", { name: "Blank TXT Forge" }));

    await user.type(screen.getByLabelText(/blank txt folder path/i), "D:\\Drops");
    await user.click(
      screen.getByRole("button", { name: /blank forge recursive toggle/i })
    );
    await user.click(screen.getByRole("button", { name: /^Dry run$/i }));
    await user.click(screen.getByRole("button", { name: ".png" }));

    await user.click(screen.getByRole("button", { name: /Forge Files/i }));

    await waitFor(() =>
      expect(
        axios.post.mock.calls.some(([url]) => url.endsWith("/dataset/captions/make_blank"))
      ).toBe(true)
    );

    expect(screen.getByText(/Created 8 · Existing 2/i)).toBeInTheDocument();
    expect(screen.getByText(/blank.csv/i)).toBeInTheDocument();
    expect(screen.getByText(/made blanks/i)).toBeInTheDocument();
  });

  it("resets caption courier fields and restores defaults", async () => {
    axios.post.mockImplementation((url, body) => {
      if (url.endsWith("/dataset/captions/copy")) {
        return Promise.resolve({
          data: {
            summary: { copied: 1, skipped_exist: 0, missing_in_src: 0 },
            csv_path: "copy.csv",
            log: ["done"],
          },
        });
      }
      throw new Error(`Unexpected axios call to ${url}`);
    });

    const user = userEvent.setup();
    render(<DatasetActionsDashboard />);

    await user.click(screen.getByRole("button", { name: "Caption Courier" }));

    await user.type(screen.getByPlaceholderText("Source folder"), "E:\\SRC");
    await user.type(screen.getByPlaceholderText("Destination folder"), "E:\\DEST");
    await user.click(screen.getByRole("button", { name: "Dry run" }));
    await user.click(screen.getByRole("button", { name: "Allow overwrite" }));

    await user.click(screen.getByRole("button", { name: /Run Copy/i }));
    await waitFor(() =>
      expect(
        axios.post.mock.calls.some(([url]) => url.endsWith("/dataset/captions/copy"))
      ).toBe(true)
    );

    await user.click(screen.getByRole("button", { name: /Reset courier/i }));
    expect(screen.getByPlaceholderText("Source folder")).toHaveValue("");
    expect(screen.getByPlaceholderText("Destination folder")).toHaveValue("");

    await user.type(screen.getByPlaceholderText("Source folder"), "E:\\SRC2");
    await user.type(screen.getByPlaceholderText("Destination folder"), "E:\\DEST2");
    await user.click(screen.getByRole("button", { name: /Run Copy/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
    const payload = axios.post.mock.calls[1][1];
    expect(payload.dry_run).toBe(true);
    expect(payload.allow_overwrite).toBe(false);
  });

  it("resets blank forge state and blocks runs without a folder", async () => {
    axios.post.mockImplementation((url, body) => {
      if (url.endsWith("/dataset/captions/make_blank")) {
        return Promise.resolve({
          data: {
            summary: { created: 1, already_exists: 0 },
            csv_path: "blank.csv",
            log: ["ok"],
          },
        });
      }
      throw new Error(`Unexpected axios call to ${url}`);
    });

    const user = userEvent.setup();
    render(<DatasetActionsDashboard />);

    await user.click(screen.getByRole("button", { name: "Blank TXT Forge" }));

    await user.type(screen.getByLabelText(/blank txt folder path/i), "D:\\Drops");
    await user.click(
      screen.getByRole("button", { name: /blank forge recursive toggle/i })
    );
    await user.click(screen.getByRole("button", { name: /^Dry run$/i }));
    await user.click(screen.getByRole("button", { name: ".png" }));
    await user.click(screen.getByRole("button", { name: /Forge Files/i }));
    await waitFor(() =>
      expect(
        axios.post.mock.calls.some(([url]) => url.endsWith("/dataset/captions/make_blank"))
      ).toBe(true)
    );

    await user.click(screen.getByRole("button", { name: /Reset blank forge/i }));

    await user.click(screen.getByRole("button", { name: /Forge Files/i }));
    expect(axios.post).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText(/blank txt folder path/i), "E:\\Renew");
    await user.click(screen.getByRole("button", { name: /Forge Files/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
    const payload = axios.post.mock.calls[1][1];
    expect(payload.recursive).toBe(true);
    expect(payload.dry_run).toBe(true);
    expect(payload.extensions).toEqual(ALL_IMG_EXTS);
  });

  it("requires selecting at least one caption before running", async () => {
    axios.post.mockImplementation((url, body) => {
      if (url.endsWith("/dataset/captions/load")) {
        return Promise.resolve({
          data: { rows: mockEntries, count: mockEntries.length },
        });
      }
      if (url.endsWith("/dataset/captions/preview")) {
        return Promise.resolve({
          data: { previews: mockPreviewRows },
        });
      }
      throw new Error(`Unexpected axios call to ${url}`);
    });

    const user = userEvent.setup();
    render(<DatasetActionsDashboard />);

    const folderInput = screen.getByLabelText(/caption folder path/i);
    await user.type(folderInput, "/tmp/dataset");
    await user.click(screen.getByRole("button", { name: /Load Folder/i }));

    const prefixInput = screen.getAllByPlaceholderText("Prefix text...")[0];
    await user.type(prefixInput, "mix");
    const stepButtons = screen.getAllByRole("button", { name: "1" });
    await user.click(stepButtons[0]);

    await user.click(screen.getByRole("button", { name: /^Preview$/i }));
    const table = await screen.findByRole("table");
    const checkboxes = within(table).getAllByRole("checkbox");
    const selectAll = checkboxes[0];
    await user.click(selectAll); // deselect all preview rows

    await user.click(screen.getByRole("button", { name: /^Run$/i }));
    await waitFor(() => {
      const runCalls = axios.post.mock.calls.filter(([url]) =>
        url.endsWith("/dataset/captions/run")
      );
      expect(runCalls.length).toBe(0);
    });
  });

  it("shows step hints, toggles backup, and cycles the paginator", async () => {
    axios.post.mockImplementation((url, body) => {
      if (url.endsWith("/dataset/captions/load")) {
        return Promise.resolve({
          data: { rows: mockEntries, count: mockEntries.length },
        });
      }
      throw new Error(`Unexpected axios call to ${url}`);
    });

    const user = userEvent.setup();
    render(<DatasetActionsDashboard />);

    const firstPrefixRow = screen.getAllByText(/Add prefix/i)[0].parentElement;
    await user.click(within(firstPrefixRow).getByRole("button", { name: "1" }));
    expect(await screen.findByText(/No prefix added/i)).toBeInTheDocument();

    const backupButton = screen.getByRole("button", { name: "Backup" });
    await user.click(backupButton);
    expect(backupButton.className).toMatch(/text-white/);

    const folderInput = screen.getByLabelText(/caption folder path/i);
    await user.type(folderInput, "/tmp/dataset");
    await user.click(screen.getByRole("button", { name: /Load Folder/i }));

    await screen.findByText("caption1.txt");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("caption2.txt")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("caption1.txt")).toBeInTheDocument();
  });
});
