import type { FormEvent } from "react";

import { FormField, TextInput } from "../../shared/form";

type AuthFormsProps = {
  authError: string | null;
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  mode: "login" | "register";
};

export function AuthForms({ authError, onRegister, onLogin, mode }: AuthFormsProps) {
  return (
    <div className="auth-form-shell">
      {authError ? <p className="error-banner">{authError}</p> : null}
      {mode === "login" ? (
        <div aria-labelledby="auth-tab-login" className="auth-form-panel" id="auth-panel-login" role="tabpanel">
          <form className="auth-form" onSubmit={onLogin}>
            <FormField label="邮箱" required>
              <TextInput name="email" required type="email" />
            </FormField>
            <FormField label="密码" required>
              <TextInput minLength={8} name="password" required type="password" />
            </FormField>
            <button type="submit">立即登录</button>
          </form>
        </div>
      ) : (
        <div aria-labelledby="auth-tab-register" className="auth-form-panel" id="auth-panel-register" role="tabpanel">
          <form className="auth-form" onSubmit={onRegister}>
            <FormField label="邮箱" required>
              <TextInput name="email" required type="email" />
            </FormField>
            <FormField label="密码" required>
              <TextInput minLength={8} name="password" required type="password" />
            </FormField>
            <FormField label="邀请码" required>
              <TextInput name="inviteCode" required />
            </FormField>
            <button type="submit">立即注册</button>
          </form>
        </div>
      )}
    </div>
  );
}
