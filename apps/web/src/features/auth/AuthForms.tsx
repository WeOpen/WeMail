import type { FormEvent, ReactNode } from "react";
import { CircleAlert, Eye, EyeOff, KeyRound, Mail, Ticket, UserRound } from "lucide-react";
import { useRef, useState } from "react";

import { Button, ButtonAnchor } from "../../shared/button";
import { FormField, TextInput } from "../../shared/form";

type AuthFormsProps = {
  authError: string | null;
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  mode: "login" | "register";
  oauthNext?: string;
};

type AuthFieldId =
  | "loginEmail"
  | "loginPassword"
  | "registerName"
  | "registerEmail"
  | "registerPassword"
  | "registerInviteCode";
type AuthFieldErrors = Partial<Record<AuthFieldId, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_FIELD_ORDER: AuthFieldId[] = ["loginEmail", "loginPassword"];
const REGISTER_FIELD_ORDER: AuthFieldId[] = ["registerName", "registerEmail", "registerPassword", "registerInviteCode"];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function getRequiredMessage(label: string) {
  return `请输入${label}`;
}

function validateEmail(value: string) {
  if (!value.trim()) return getRequiredMessage("邮箱");
  if (!EMAIL_PATTERN.test(value.trim())) return "请输入有效邮箱";
  return null;
}

function validateName(value: string) {
  if (!value.trim()) return getRequiredMessage("用户名");
  return null;
}

function validatePassword(value: string) {
  if (!value.trim()) return getRequiredMessage("密码");
  if (value.length < 8) return "密码至少需要 8 位";
  return null;
}

function compactFieldErrors(errors: AuthFieldErrors) {
  const visibleErrors: AuthFieldErrors = {};

  (Object.entries(errors) as Array<[AuthFieldId, string | undefined]>).forEach(([fieldId, message]) => {
    if (message) visibleErrors[fieldId] = message;
  });

  return visibleErrors;
}

function AuthFieldValidation({ children, id }: { children: ReactNode; id: string }) {
  return (
    <span className="auth-field-validation" id={id} role="alert">
      <CircleAlert aria-hidden="true" />
      {children}
    </span>
  );
}

export function AuthForms({ authError, onRegister, onLogin, mode, oauthNext = "/dashboard" }: AuthFormsProps) {
  const [isLoginPasswordVisible, setIsLoginPasswordVisible] = useState(false);
  const [isRegisterPasswordVisible, setIsRegisterPasswordVisible] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerInviteCode, setRegisterInviteCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);
  const registerNameRef = useRef<HTMLInputElement>(null);
  const registerEmailRef = useRef<HTMLInputElement>(null);
  const registerPasswordRef = useRef<HTMLInputElement>(null);
  const registerInviteCodeRef = useRef<HTMLInputElement>(null);

  const fieldRefs = {
    loginEmail: loginEmailRef,
    loginPassword: loginPasswordRef,
    registerName: registerNameRef,
    registerEmail: registerEmailRef,
    registerPassword: registerPasswordRef,
    registerInviteCode: registerInviteCodeRef
  };

  function clearFieldError(fieldId: AuthFieldId) {
    setFieldErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }

  function getFieldErrorProps(
    fieldId: AuthFieldId,
    inputId: string
  ): { "aria-describedby"?: string; "aria-invalid"?: "true" } {
    return fieldErrors[fieldId]
      ? {
          "aria-describedby": `${inputId}-validation`,
          "aria-invalid": "true"
        }
      : {};
  }

  function renderFieldValidation(fieldId: AuthFieldId, inputId: string) {
    const message = fieldErrors[fieldId];
    if (!message) return null;
    return <AuthFieldValidation id={`${inputId}-validation`}>{message}</AuthFieldValidation>;
  }

  function focusFirstInvalid(errors: AuthFieldErrors, fieldOrder: AuthFieldId[]) {
    const firstInvalidField = fieldOrder.find((fieldId) => errors[fieldId]);
    if (!firstInvalidField) return;
    fieldRefs[firstInvalidField].current?.focus();
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: AuthFieldErrors = {
      loginEmail: validateEmail(loginEmail) ?? undefined,
      loginPassword: validatePassword(loginPassword) ?? undefined
    };
    const visibleErrors = compactFieldErrors(nextErrors);

    if (Object.keys(visibleErrors).length > 0) {
      setFieldErrors(visibleErrors);
      focusFirstInvalid(visibleErrors, LOGIN_FIELD_ORDER);
      return;
    }

    setFieldErrors({});
    await onLogin(event);
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: AuthFieldErrors = {
      registerName: validateName(registerName) ?? undefined,
      registerEmail: validateEmail(registerEmail) ?? undefined,
      registerPassword: validatePassword(registerPassword) ?? undefined
    };
    const visibleErrors = compactFieldErrors(nextErrors);

    if (Object.keys(visibleErrors).length > 0) {
      setFieldErrors(visibleErrors);
      focusFirstInvalid(visibleErrors, REGISTER_FIELD_ORDER);
      return;
    }

    setFieldErrors({});
    await onRegister(event);
  }

  return (
    <div className="auth-form-shell">
      {authError ? <p className="error-banner">{authError}</p> : null}
      {mode === "login" ? (
        <div aria-labelledby="auth-tab-login" className="auth-form-panel" id="auth-panel-login" role="tabpanel">
          <form className="auth-form" noValidate onSubmit={handleLoginSubmit}>
            <FormField htmlFor="login-email" label="邮箱" required>
              <div className="auth-field-stack">
                <div className={cx("auth-input-shell form-control-shell", fieldErrors.loginEmail && "is-invalid")}>
                  <span aria-hidden="true" className="auth-input-icon form-control-icon">
                    <Mail />
                  </span>
                  <TextInput
                    {...getFieldErrorProps("loginEmail", "login-email")}
                    className="auth-input-control"
                    id="login-email"
                    name="email"
                    onChange={(event) => {
                      setLoginEmail(event.target.value);
                      clearFieldError("loginEmail");
                    }}
                    ref={loginEmailRef}
                    required
                    type="email"
                    value={loginEmail}
                  />
                </div>
                {renderFieldValidation("loginEmail", "login-email")}
              </div>
            </FormField>
            <FormField htmlFor="login-password" label="密码" required>
              <div className="auth-field-stack">
                <div className={cx("auth-input-shell form-control-shell", fieldErrors.loginPassword && "is-invalid")}>
                  <span aria-hidden="true" className="auth-input-icon form-control-icon">
                    <KeyRound />
                  </span>
                  <TextInput
                    {...getFieldErrorProps("loginPassword", "login-password")}
                    className="auth-input-control"
                    id="login-password"
                    minLength={8}
                    name="password"
                    onChange={(event) => {
                      setLoginPassword(event.target.value);
                      clearFieldError("loginPassword");
                    }}
                    ref={loginPasswordRef}
                    required
                    type={isLoginPasswordVisible ? "text" : "password"}
                    value={loginPassword}
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
                {renderFieldValidation("loginPassword", "login-password")}
              </div>
            </FormField>
            <Button type="submit" variant="primary">
              立即登录
            </Button>
            <div className="auth-divider">
              <span>或</span>
            </div>
            <div className="auth-oauth-list" aria-label="快捷登录">
              <ButtonAnchor
                aria-label="使用 GitHub 登录"
                href={`/api/auth/oauth/github/start?next=${encodeURIComponent(oauthNext)}`}
                leadingIcon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0.296997C5.37 0.296997 0 5.67 0 12.297C0 17.6 3.438 22.097 8.205 23.682C8.805 23.795 9.025 23.424 9.025 23.105C9.025 22.82 9.015 22.065 9.01 21.065C5.672 21.789 4.968 19.455 4.968 19.455C4.422 18.07 3.633 17.7 3.633 17.7C2.546 16.956 3.717 16.971 3.717 16.971C4.922 17.055 5.555 18.207 5.555 18.207C6.625 20.042 8.364 19.512 9.05 19.205C9.158 18.429 9.467 17.9 9.81 17.6C7.145 17.3 4.344 16.268 4.344 11.67C4.344 10.36 4.809 9.29 5.579 8.45C5.444 8.147 5.039 6.927 5.684 5.274C5.684 5.274 6.689 4.952 8.984 6.504C9.944 6.237 10.964 6.105 11.984 6.099C13.004 6.105 14.024 6.237 14.984 6.504C17.264 4.952 18.269 5.274 18.269 5.274C18.914 6.927 18.509 8.147 18.389 8.45C19.154 9.29 19.619 10.36 19.619 11.67C19.619 16.28 16.814 17.295 14.144 17.59C14.564 17.95 14.954 18.686 14.954 19.81C14.954 21.416 14.939 22.706 14.939 23.096C14.939 23.411 15.149 23.786 15.764 23.666C20.565 22.092 24 17.592 24 12.297C24 5.67 18.627 0.296997 12 0.296997Z"/>
                  </svg>
                }
                variant="secondary"
              >
                GitHub
              </ButtonAnchor>
              <ButtonAnchor
                aria-label="使用 LinuxDo 登录"
                href={`/api/auth/oauth/linuxdo/start?next=${encodeURIComponent(oauthNext)}`}
                leadingIcon={
                  <img src="/icons/linuxdo.svg" width="20" height="20" alt="" aria-hidden="true" />
                }
                variant="secondary"
              >
                LinuxDo
              </ButtonAnchor>
            </div>
          </form>
        </div>
      ) : (
        <div aria-labelledby="auth-tab-register" className="auth-form-panel" id="auth-panel-register" role="tabpanel">
          <form className="auth-form" noValidate onSubmit={handleRegisterSubmit}>
            <FormField htmlFor="register-name" label="用户名" required>
              <div className="auth-field-stack">
                <div className={cx("auth-input-shell form-control-shell", fieldErrors.registerName && "is-invalid")}>
                  <span aria-hidden="true" className="auth-input-icon form-control-icon">
                    <UserRound />
                  </span>
                  <TextInput
                    {...getFieldErrorProps("registerName", "register-name")}
                    className="auth-input-control"
                    id="register-name"
                    name="name"
                    onChange={(event) => {
                      setRegisterName(event.target.value);
                      clearFieldError("registerName");
                    }}
                    ref={registerNameRef}
                    required
                    value={registerName}
                  />
                </div>
                {renderFieldValidation("registerName", "register-name")}
              </div>
            </FormField>
            <FormField htmlFor="register-email" label="邮箱" required>
              <div className="auth-field-stack">
                <div className={cx("auth-input-shell form-control-shell", fieldErrors.registerEmail && "is-invalid")}>
                  <span aria-hidden="true" className="auth-input-icon form-control-icon">
                    <Mail />
                  </span>
                  <TextInput
                    {...getFieldErrorProps("registerEmail", "register-email")}
                    className="auth-input-control"
                    id="register-email"
                    name="email"
                    onChange={(event) => {
                      setRegisterEmail(event.target.value);
                      clearFieldError("registerEmail");
                    }}
                    ref={registerEmailRef}
                    required
                    type="email"
                    value={registerEmail}
                  />
                </div>
                {renderFieldValidation("registerEmail", "register-email")}
              </div>
            </FormField>
            <FormField htmlFor="register-password" label="密码" required>
              <div className="auth-field-stack">
                <div className={cx("auth-input-shell form-control-shell", fieldErrors.registerPassword && "is-invalid")}>
                  <span aria-hidden="true" className="auth-input-icon form-control-icon">
                    <KeyRound />
                  </span>
                  <TextInput
                    {...getFieldErrorProps("registerPassword", "register-password")}
                    className="auth-input-control"
                    id="register-password"
                    minLength={8}
                    name="password"
                    onChange={(event) => {
                      setRegisterPassword(event.target.value);
                      clearFieldError("registerPassword");
                    }}
                    ref={registerPasswordRef}
                    required
                    type={isRegisterPasswordVisible ? "text" : "password"}
                    value={registerPassword}
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
                {renderFieldValidation("registerPassword", "register-password")}
              </div>
            </FormField>
            <FormField htmlFor="register-invite-code" label="邀请码">
              <div className="auth-field-stack">
                <div className={cx("auth-input-shell form-control-shell", fieldErrors.registerInviteCode && "is-invalid")}>
                  <span aria-hidden="true" className="auth-input-icon form-control-icon">
                    <Ticket />
                  </span>
                  <TextInput
                    {...getFieldErrorProps("registerInviteCode", "register-invite-code")}
                    className="auth-input-control"
                    id="register-invite-code"
                    name="inviteCode"
                    onChange={(event) => {
                      setRegisterInviteCode(event.target.value);
                      clearFieldError("registerInviteCode");
                    }}
                    ref={registerInviteCodeRef}
                    value={registerInviteCode}
                  />
                </div>
                {renderFieldValidation("registerInviteCode", "register-invite-code")}
              </div>
            </FormField>
            <Button type="submit" variant="primary">
              立即注册
            </Button>
            <div className="auth-divider">
              <span>或</span>
            </div>
            <div className="auth-oauth-list" aria-label="快捷登录">
              <ButtonAnchor
                aria-label="使用 GitHub 登录"
                href={`/api/auth/oauth/github/start?next=${encodeURIComponent(oauthNext)}`}
                leadingIcon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0.296997C5.37 0.296997 0 5.67 0 12.297C0 17.6 3.438 22.097 8.205 23.682C8.805 23.795 9.025 23.424 9.025 23.105C9.025 22.82 9.015 22.065 9.01 21.065C5.672 21.789 4.968 19.455 4.968 19.455C4.422 18.07 3.633 17.7 3.633 17.7C2.546 16.956 3.717 16.971 3.717 16.971C4.922 17.055 5.555 18.207 5.555 18.207C6.625 20.042 8.364 19.512 9.05 19.205C9.158 18.429 9.467 17.9 9.81 17.6C7.145 17.3 4.344 16.268 4.344 11.67C4.344 10.36 4.809 9.29 5.579 8.45C5.444 8.147 5.039 6.927 5.684 5.274C5.684 5.274 6.689 4.952 8.984 6.504C9.944 6.237 10.964 6.105 11.984 6.099C13.004 6.105 14.024 6.237 14.984 6.504C17.264 4.952 18.269 5.274 18.269 5.274C18.914 6.927 18.509 8.147 18.389 8.45C19.154 9.29 19.619 10.36 19.619 11.67C19.619 16.28 16.814 17.295 14.144 17.59C14.564 17.95 14.954 18.686 14.954 19.81C14.954 21.416 14.939 22.706 14.939 23.096C14.939 23.411 15.149 23.786 15.764 23.666C20.565 22.092 24 17.592 24 12.297C24 5.67 18.627 0.296997 12 0.296997Z"/>
                  </svg>
                }
                variant="secondary"
              >
                GitHub
              </ButtonAnchor>
              <ButtonAnchor
                aria-label="使用 LinuxDo 登录"
                href={`/api/auth/oauth/linuxdo/start?next=${encodeURIComponent(oauthNext)}`}
                leadingIcon={
                  <img src="/icons/linuxdo.svg" width="20" height="20" alt="" aria-hidden="true" />
                }
                variant="secondary"
              >
                LinuxDo
              </ButtonAnchor>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
