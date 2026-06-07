import userEvent from "@testing-library/user-event";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Pagination } from "../shared/pagination";

describe("shared pagination primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders pagination landmarks, current page state, and collapsed ranges", () => {
    render(<Pagination page={10} pageSize={10} total={200} />);

    expect(screen.getByRole("navigation", { name: "分页导航" })).toHaveClass("ui-pagination");
    expect(screen.getByRole("button", { name: "第 10 页" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "第 10 页" })).toHaveAttribute("data-state", "current");
    expect(screen.getAllByText("…")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "上一页" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "下一页" })).toBeEnabled();
  });

  it("updates controlled page state and calls onChange with the next page", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    function Host() {
      const [page, setPage] = useState(2);

      return (
        <Pagination
          onChange={(nextPage) => {
            handleChange(nextPage);
            setPage(nextPage);
          }}
          page={page}
          pageSize={20}
          total={240}
        />
      );
    }

    render(<Host />);
    await user.click(screen.getByRole("button", { name: "第 3 页" }));

    expect(handleChange).toHaveBeenCalledWith(3);
    expect(screen.getByRole("button", { name: "第 3 页" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "第 2 页" })).toHaveAttribute("data-state", "inactive");
  });

  it("renders total count and page size controls when page size options are provided", async () => {
    const user = userEvent.setup();
    const handlePageSizeChange = vi.fn();

    render(
      <Pagination
        onPageSizeChange={handlePageSizeChange}
        page={1}
        pageSize={10}
        pageSizeOptions={[10, 20, 50]}
        total={126}
      />
    );

    expect(screen.getByText("共 126 条")).toBeInTheDocument();
    expect(screen.getByText("每页条数")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "每页条数" }));
    await user.click(within(await screen.findByRole("listbox", { name: "每页条数" })).getByRole("option", { name: "20" }));

    expect(handlePageSizeChange).toHaveBeenCalledWith(20);
  });

  it("supports arrow key focus movement across pagination controls", () => {
    render(<Pagination page={3} pageSize={10} total={120} />);

    const currentPage = screen.getByRole("button", { name: "第 3 页" });
    currentPage.focus();
    fireEvent.keyDown(screen.getByRole("list"), { key: "ArrowRight" });

    expect(screen.getByRole("button", { name: "第 4 页" })).toHaveFocus();
  });
});
