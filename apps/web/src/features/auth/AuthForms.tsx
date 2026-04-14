import type { FormEvent } from "react";

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
            <p className="panel-kicker">账号登录</p>
            <h2>登录到 wemail</h2>
            <label>
              邮箱
              <input name="email" type="email" required />
            </label>
            <label>
              密码
              <input name="password" type="password" minLength={8} required />
            </label>
            <button type="submit">立即登录</button>
          </form>
        </div>
      ) : (
        <div aria-labelledby="auth-tab-register" className="auth-form-panel" id="auth-panel-register" role="tabpanel">
          <form className="auth-form" onSubmit={onRegister}>
            <p className="panel-kicker">邀请码注册</p>
            <h2>创建你的工作台账号</h2>
            <label>
              邮箱
              <input name="email" type="email" required />
            </label>
            <label>
              密码
              <input name="password" type="password" minLength={8} required />
            </label>
            <label>
              邀请码
              <input name="inviteCode" required />
            </label>
            <button type="submit">立即注册</button>
          </form>
        </div>
      )}
    </div>
  );
}
