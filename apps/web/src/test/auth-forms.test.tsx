import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { resetAppStore } from "../app/appStore";
import { AuthForms } from "../features/auth/AuthForms";
import { useAuthSession } from "../features/auth/useAuthSession";
import { AuthPage } from "../pages/AuthPage";
import { jsonResponse } from "./helpers/mock-api";

const authFormProps = {
  authError: null,
  onLogin: vi.fn(),
  onRegister: vi.fn()
};

function AuthSessionHarness({ mode }: { mode: "login" | "register" }) {
  const auth = useAuthSession({
    onSignedIn: vi.fn(),
    onSignedOut: vi.fn(),
    onToast: vi.fn()
  });

  return (
    <form onSubmit={mode === "login" ? auth.handleLogin : auth.handleRegister}>
      <input defaultValue="willxue@example.com" name="email" />
      <input defaultValue="password123" name="password" />
      {mode === "register" ? <input defaultValue="INVITE-1" name="inviteCode" /> : null}
      <button type="submit">{mode === "login" ? "提交登录" : "提交注册"}</button>
      {auth.authError ? <p role="alert">{auth.authError}</p> : null}
    </form>
  );
}

describe("AuthForms", () => {
  beforeEach(() => {
    resetAppStore();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps login and register email values independent across mode switches", () => {
    const { rerender } = render(<AuthForms {...authFormProps} mode="login" oauthNext="/mail/inbox" />);
    const loginEmailInput = screen.getByLabelText(/^邮箱/);

    fireEvent.change(loginEmailInput, { target: { value: "login@example.com" } });

    rerender(<AuthForms {...authFormProps} mode="register" oauthNext="/mail/inbox" />);
    const registerEmailInput = screen.getByLabelText(/^邮箱/);

    expect(registerEmailInput).toHaveValue("");

    fireEvent.change(registerEmailInput, { target: { value: "register@example.com" } });
    fireEvent.change(registerEmailInput, { target: { value: "" } });

    rerender(<AuthForms {...authFormProps} mode="login" oauthNext="/mail/inbox" />);

    expect(screen.getByLabelText(/^邮箱/)).toHaveValue("login@example.com");
  });

  it("renders GitHub and LinuxDo OAuth links with the post-auth target", () => {
    render(<AuthForms {...authFormProps} mode="login" oauthNext="/settings/profile" />);

    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "/api/auth/oauth/github/start?next=%2Fsettings%2Fprofile"
    );
    expect(screen.getByRole("link", { name: "LinuxDo" })).toHaveAttribute(
      "href",
      "/api/auth/oauth/linuxdo/start?next=%2Fsettings%2Fprofile"
    );
  });

  it("asks OAuth newcomers for an invite code before finalizing login", () => {
    const onOAuthFinalize = vi.fn();

    render(
      <MemoryRouter initialEntries={["/login?oauth=invite&provider=github&ticket=ticket-1&next=%2Fdashboard"]}>
        <Routes>
          <Route
            path="/login"
            element={
              <AuthPage
                authError={null}
                onLogin={vi.fn()}
                onOAuthFinalize={onOAuthFinalize}
                onRegister={vi.fn()}
                onToggleTheme={vi.fn()}
                theme="dark"
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^邀请码/), { target: { value: "INVITE-OAUTH" } });
    fireEvent.submit(screen.getByRole("button", { name: "继续进入" }).closest("form")!);

    expect(onOAuthFinalize).toHaveBeenCalledWith({
      inviteCode: "INVITE-OAUTH",
      provider: "github",
      ticket: "ticket-1"
    });
  });

  it("renders custom Chinese required messages and blocks empty login submissions", () => {
    const onLogin = vi.fn();
    render(<AuthForms authError={null} mode="login" onLogin={onLogin} onRegister={vi.fn()} />);

    const form = screen.getByRole("button", { name: "立即登录" }).closest("form");
    expect(form).toHaveAttribute("novalidate");

    fireEvent.submit(form!);

    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getByText("请输入邮箱")).toHaveClass("auth-field-validation");
    expect(screen.getByText("请输入密码")).toHaveClass("auth-field-validation");
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getByLabelText(/^邮箱/)).toHaveAttribute("aria-invalid", "true");
  });

  it("submits registration when only the invite code is empty", () => {
    const onRegister = vi.fn();
    render(<AuthForms authError={null} mode="register" onLogin={vi.fn()} onRegister={onRegister} />);

    fireEvent.change(screen.getByLabelText(/^用户名/), { target: { value: "Will Xue" } });
    fireEvent.change(screen.getByLabelText(/^邮箱/), { target: { value: "willxue@example.com" } });
    fireEvent.change(screen.getByLabelText(/^密码/), { target: { value: "password123" } });
    fireEvent.submit(screen.getByRole("button", { name: "立即注册" }).closest("form")!);

    expect(onRegister).toHaveBeenCalledOnce();
    expect(screen.queryByText("请输入邀请码")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^邀请码/)).not.toHaveAttribute("aria-invalid");
  });

  it("shows register backend errors in Chinese", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({ error: "User already exists" }, 409));

    render(<AuthSessionHarness mode="register" />);
    fireEvent.submit(screen.getByRole("button", { name: "提交注册" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("该邮箱已注册，请直接登录或更换邮箱。");
    expect(screen.queryByText("User already exists")).not.toBeInTheDocument();
  });

  it("shows login backend errors in Chinese", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({ error: "Invalid credentials" }, 401));

    render(<AuthSessionHarness mode="login" />);
    fireEvent.submit(screen.getByRole("button", { name: "提交登录" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("邮箱或密码不正确。");
    expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument();
  });
});
