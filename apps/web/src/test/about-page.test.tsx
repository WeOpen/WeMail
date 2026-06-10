import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { WEMAIL_VERSION_LABEL } from "@wemail/shared";

import { AboutPage } from "../pages/AboutPage";

describe("AboutPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a complete product about page that matches the system workspace", () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "把一次性邮箱变成团队可治理的邮件边界" })).toBeInTheDocument();
    expect(screen.getByText(/团队与外部世界之间的可信邮件边界/)).toBeInTheDocument();

    const boundaryFlow = screen.getByRole("list", { name: "邮件边界流程" });
    expect(within(boundaryFlow).getByText("外部渠道")).toBeInTheDocument();
    expect(within(boundaryFlow).getByText("隔离地址")).toBeInTheDocument();
    expect(within(boundaryFlow).getByText("治理工作台")).toBeInTheDocument();
    expect(within(boundaryFlow).getByText("集成出口")).toBeInTheDocument();

    const proof = screen.getByRole("list", { name: "产品可信证明" });
    expect(within(proof).getByText("Cloudflare Workers")).toBeInTheDocument();
    expect(within(proof).getByText("D1 + R2")).toBeInTheDocument();
    expect(within(proof).getByText(WEMAIL_VERSION_LABEL)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "我们为谁而建" })).toBeInTheDocument();
    expect(screen.getByText("产品与增长团队")).toBeInTheDocument();
    expect(screen.getByText("开发与测试团队")).toBeInTheDocument();
    expect(screen.getByText("管理员与安全负责人")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "我们的构建原则" })).toBeInTheDocument();
    expect(screen.getByText("最小暴露")).toBeInTheDocument();
    expect(screen.getByText("治理先行")).toBeInTheDocument();
    expect(screen.getByText("边缘可靠")).toBeInTheDocument();
    expect(screen.getByText("开放接入")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "打开产品文档" })).toHaveAttribute(
      "href",
      "https://doc.wemail.willxue.com"
    );
    expect(screen.getByRole("link", { name: "查看设计系统" })).toHaveAttribute("href", "/design-system");
  });
});
