import type { FormEvent } from "react";
import { Eye, EyeOff, KeyRound, Mail, Ticket } from "lucide-react";
import { useState } from "react";

import { Button } from "../../shared/button";
import { FormField, TextInput } from "../../shared/form";

type AuthFormsProps = {
  authError: string | null;
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  mode: "login" | "register";
};

export function AuthForms({ authError, onRegister, onLogin, mode }: AuthFormsProps) {
  const [isLoginPasswordVisible, setIsLoginPasswordVisible] = useState(false);
  const [isRegisterPasswordVisible, setIsRegisterPasswordVisible] = useState(false);

  return (
    <div className="auth-form-shell">
      {authError ? <p className="error-banner">{authError}</p> : null}
      {mode === "login" ? (
        <div aria-labelledby="auth-tab-login" className="auth-form-panel" id="auth-panel-login" role="tabpanel">
          <form className="auth-form" onSubmit={onLogin}>
            <FormField htmlFor="login-email" label="邮箱" required>
              <div className="auth-input-shell form-control-shell">
                <span aria-hidden="true" className="auth-input-icon form-control-icon">
                  <Mail />
                </span>
                <TextInput className="auth-input-control" id="login-email" name="email" required type="email" />
              </div>
            </FormField>
            <FormField htmlFor="login-password" label="密码" required>
              <div className="auth-input-shell form-control-shell">
                <span aria-hidden="true" className="auth-input-icon form-control-icon">
                  <KeyRound />
                </span>
                <TextInput
                  className="auth-input-control"
                  id="login-password"
                  minLength={8}
                  name="password"
                  required
                  type={isLoginPasswordVisible ? "text" : "password"}
                />
                <button
                  aria-label={isLoginPasswordVisible ? "隐藏密码" : "显示密码"}
                  className="auth-input-toggle form-control-toggle"
                  onClick={() => setIsLoginPasswordVisible((current) => !current)}
                  type="button"
                >
                  {isLoginPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </FormField>
            <Button type="submit" variant="primary">
              立即登录
            </Button>
          </form>
        </div>
      ) : (
        <div aria-labelledby="auth-tab-register" className="auth-form-panel" id="auth-panel-register" role="tabpanel">
          <form className="auth-form" onSubmit={onRegister}>
            <FormField htmlFor="register-email" label="邮箱" required>
              <div className="auth-input-shell form-control-shell">
                <span aria-hidden="true" className="auth-input-icon form-control-icon">
                  <Mail />
                </span>
                <TextInput className="auth-input-control" id="register-email" name="email" required type="email" />
              </div>
            </FormField>
            <FormField htmlFor="register-password" label="密码" required>
              <div className="auth-input-shell form-control-shell">
                <span aria-hidden="true" className="auth-input-icon form-control-icon">
                  <KeyRound />
                </span>
                <TextInput
                  className="auth-input-control"
                  id="register-password"
                  minLength={8}
                  name="password"
                  required
                  type={isRegisterPasswordVisible ? "text" : "password"}
                />
                <button
                  aria-label={isRegisterPasswordVisible ? "隐藏密码" : "显示密码"}
                  className="auth-input-toggle form-control-toggle"
                  onClick={() => setIsRegisterPasswordVisible((current) => !current)}
                  type="button"
                >
                  {isRegisterPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </FormField>
            <FormField htmlFor="register-invite-code" label="邀请码" required>
              <div className="auth-input-shell form-control-shell">
                <span aria-hidden="true" className="auth-input-icon form-control-icon">
                  <Ticket />
                </span>
                <TextInput className="auth-input-control" id="register-invite-code" name="inviteCode" required />
              </div>
            </FormField>
            <Button type="submit" variant="primary">
              立即注册
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
