import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow
} from "../shared/table";

describe("shared table primitives", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the table structure with unified ui-table classes and semantic roles", () => {
    render(
      <TableContainer data-testid="container">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell align="end" nowrap width={92}>
                操作
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>acct_1</TableCell>
              <TableCell align="end" nowrap>
                查看
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );

    expect(screen.getByTestId("container")).toHaveClass("ui-table-container");
    expect(screen.getByRole("table")).toHaveClass("ui-table");

    const idHeader = screen.getByRole("columnheader", { name: "ID" });
    expect(idHeader).toHaveClass("ui-table-header-cell");
    expect(idHeader).toHaveAttribute("scope", "col");

    const actionHeader = screen.getByRole("columnheader", { name: "操作" });
    expect(actionHeader).toHaveAttribute("data-align", "end");
    expect(actionHeader).toHaveAttribute("data-nowrap", "true");
    expect(actionHeader).toHaveStyle({ width: "92px" });

    const actionCell = screen.getByRole("cell", { name: "查看" });
    expect(actionCell).toHaveClass("ui-table-cell");
    expect(actionCell).toHaveAttribute("data-align", "end");
    expect(actionCell).toHaveAttribute("data-nowrap", "true");
  });

  it("omits data attributes when using the default start alignment and wrapping behavior", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>ops@wemail.ai</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const cell = screen.getByRole("cell", { name: "ops@wemail.ai" });
    expect(cell).not.toHaveAttribute("data-align");
    expect(cell).not.toHaveAttribute("data-nowrap");
  });

  it("supports liquid glass variants, density, and row state classes", () => {
    render(
      <TableContainer data-testid="liquid-container" density="compact" variant="liquid">
        <Table>
          <TableBody>
            <TableRow isInteractive isSelected>
              <TableCell>glass-row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );

    const container = screen.getByTestId("liquid-container");
    expect(container).toHaveClass("ui-table-container", "ui-table-container-liquid", "ui-table-density-compact");
    expect(container).toHaveAttribute("data-density", "compact");

    const row = screen.getByRole("row", { name: "glass-row" });
    expect(row).toHaveClass("ui-table-row", "is-selected", "is-interactive");
    expect(row).toHaveAttribute("data-selected", "true");
    expect(row).toHaveAttribute("data-interactive", "true");
  });
});
