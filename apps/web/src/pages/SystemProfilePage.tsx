import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarClock,
  Languages,
  LayoutDashboard,
  LogOut,
  Mail,
  MonitorSmartphone,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound
} from "lucide-react";

import {
  userProfileOptions,
  type UserProfileSummary,
  type UserProfileUpdateInput,
  type UserSessionSummary
} from "@wemail/shared";

import { Avatar } from "../shared/avatar";
import { Badge } from "../shared/badge";
import { Button } from "../shared/button";
import { formatDisplayEmail } from "../shared/display";
import { FormField, RadioGroupField, SelectInput, TextInput, TextareaInput } from "../shared/form";
import { KVList } from "../shared/kv-list";
import { Page } from "../shared/page-layout";

type SystemProfilePageProps = {
  profile: UserProfileSummary;
  isSavingPreferences: boolean;
  isSavingProfile: boolean;
  isRevokingSession?: boolean;
  onLogoutCurrentDevice: () => void;
  onRevokeOtherSessions?: () => Promise<void>;
  onRevokeSession?: (sessionId: string) => Promise<void>;
  onSavePreferences: (payload: UserProfileUpdateInput) => Promise<void>;
  onSaveProfile: (payload: UserProfileUpdateInput) => Promise<void>;
  sessions?: UserSessionSummary[];
};

function formatRole(role: UserProfileSummary["user"]["role"]) {
  return role === "admin" ? "管理员" : "成员";
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "保存失败，请稍后重试。";
}

function formatDate(iso: string, preferences: UserProfileSummary["preferences"]) {
  const parts = new Intl.DateTimeFormat(preferences.locale, {
    timeZone: preferences.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = values.year ?? "";
  const month = values.month ?? "";
  const day = values.day ?? "";

  if (preferences.dateFormat === "dd-mm-yyyy") return `${day}-${month}-${year}`;
  if (preferences.dateFormat === "mm-dd-yyyy") return `${month}-${day}-${year}`;
  return `${year}-${month}-${day}`;
}

function formatDateTime(iso: string, preferences: UserProfileSummary["preferences"]) {
  const date = formatDate(iso, preferences);
  const time = new Intl.DateTimeFormat(preferences.locale, {
    timeZone: preferences.timezone,
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
  return `${date} ${time}`;
}

function resolveDisplayName(profile: UserProfileSummary) {
  return profile.user.name.trim() || formatDisplayEmail(profile.user.email);
}

function formatLocale(locale: UserProfileSummary["preferences"]["locale"]) {
  return locale === "zh-CN" ? "简体中文" : "English";
}

function formatLandingPage(landingPage: UserProfileSummary["preferences"]["landingPage"]) {
  if (landingPage === "/mail/list") return "邮件列表";
  if (landingPage === "/api-keys") return "API 密钥";
  return "仪表盘";
}

function formatDensity(density: UserProfileSummary["preferences"]["density"]) {
  return density === "compact" ? "紧凑" : "舒展";
}

function formatSessionDevice(session: UserSessionSummary) {
  const userAgent = session.userAgent ?? "";
  if (!userAgent) return "未知设备";
  const browser = userAgent.includes("Firefox")
    ? "Firefox"
    : userAgent.includes("Edg/")
      ? "Edge"
      : userAgent.includes("Chrome")
        ? "Chrome"
        : userAgent.includes("Safari")
          ? "Safari"
          : "浏览器";
  const platform = userAgent.includes("iPhone") || userAgent.includes("Android")
    ? "移动设备"
    : userAgent.includes("Mac")
      ? "macOS"
      : userAgent.includes("Windows")
        ? "Windows"
        : "设备";
  return `${browser} · ${platform}`;
}

export function SystemProfilePage({
  profile,
  isSavingPreferences,
  isSavingProfile,
  isRevokingSession = false,
  onLogoutCurrentDevice,
  onRevokeOtherSessions,
  onRevokeSession,
  onSavePreferences,
  onSaveProfile,
  sessions = []
}: SystemProfilePageProps) {
  const [displayName, setDisplayName] = useState(resolveDisplayName(profile));
  const [bio, setBio] = useState(profile.preferences.bio);
  const [locale, setLocale] = useState(profile.preferences.locale);
  const [timezone, setTimezone] = useState(profile.preferences.timezone);
  const [dateFormat, setDateFormat] = useState(profile.preferences.dateFormat);
  const [landingPage, setLandingPage] = useState(profile.preferences.landingPage);
  const [density, setDensity] = useState(profile.preferences.density);
  const [profileSubmitError, setProfileSubmitError] = useState<string | null>(null);
  const [preferencesSubmitError, setPreferencesSubmitError] = useState<string | null>(null);
  const roleLabel = formatRole(profile.user.role);
  const displayEmail = formatDisplayEmail(profile.user.email);
  const hasOtherSessions = sessions.some((session) => !session.isCurrent);
  const hasProfileChanges = displayName !== resolveDisplayName(profile) || bio !== profile.preferences.bio;
  const hasPreferenceChanges =
    locale !== profile.preferences.locale ||
    timezone !== profile.preferences.timezone ||
    dateFormat !== profile.preferences.dateFormat ||
    landingPage !== profile.preferences.landingPage ||
    density !== profile.preferences.density;

  useEffect(() => {
    setDisplayName(resolveDisplayName(profile));
    setBio(profile.preferences.bio);
    setLocale(profile.preferences.locale);
    setTimezone(profile.preferences.timezone);
    setDateFormat(profile.preferences.dateFormat);
    setLandingPage(profile.preferences.landingPage);
    setDensity(profile.preferences.density);
    setProfileSubmitError(null);
    setPreferencesSubmitError(null);
  }, [profile]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasProfileChanges) return;

    setProfileSubmitError(null);
    try {
      await onSaveProfile({
        name: displayName,
        preferences: {
          bio
        }
      });
    } catch (error) {
      setProfileSubmitError(readErrorMessage(error));
    }
  }

  async function handlePreferencesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasPreferenceChanges) return;

    setPreferencesSubmitError(null);
    try {
      await onSavePreferences({
        preferences: {
          locale,
          timezone,
          dateFormat,
          landingPage,
          density
        }
      });
    } catch (error) {
      setPreferencesSubmitError(readErrorMessage(error));
    }
  }

  return (
    <Page as="main" className="workspace-grid profile-settings-grid profile-settings-page">
      <section aria-label="个人设置概览" className="panel workspace-card page-panel profile-overview-panel">
        <div className="profile-overview-identity">
          <Avatar
            aria-label="当前用户头像"
            className="profile-overview-avatar"
            fallback={displayName.slice(0, 1)}
            name={displayName}
            size="xl"
          />
          <div className="profile-overview-copy">
            <p className="panel-kicker">个人设置</p>
            <h1>{displayName}</h1>
            <div className="profile-overview-email">
              <Mail size={16} strokeWidth={1.8} />
              <span className="profile-email-text" title={profile.user.email}>
                {displayEmail}
              </span>
            </div>
            <div className="profile-overview-badges">
              <Badge variant="brand">{roleLabel}</Badge>
              <Badge variant={profile.user.status === "active" ? "success" : "warning"}>
                {profile.user.status === "active" ? "正常" : "已停用"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="profile-overview-stats" role="list">
          <div className="profile-overview-stat" role="listitem">
            <Languages size={18} strokeWidth={1.8} />
            <span>语言</span>
            <strong>{formatLocale(profile.preferences.locale)}</strong>
          </div>
          <div className="profile-overview-stat" role="listitem">
            <LayoutDashboard size={18} strokeWidth={1.8} />
            <span>默认进入页</span>
            <strong>{formatLandingPage(profile.preferences.landingPage)}</strong>
          </div>
          <div className="profile-overview-stat" role="listitem">
            <SlidersHorizontal size={18} strokeWidth={1.8} />
            <span>阅读密度</span>
            <strong>{formatDensity(profile.preferences.density)}</strong>
          </div>
        </div>
      </section>

      <div className="profile-content-grid">
        <div aria-label="资料与偏好表单" className="profile-main-column">
          <section className="panel workspace-card page-panel profile-settings-panel">
            <p className="panel-kicker">账号资料</p>

            <form onSubmit={handleProfileSubmit}>
              {profileSubmitError ? (
                <p aria-label="资料保存失败" className="error-banner" role="alert">
                  {profileSubmitError}
                </p>
              ) : null}
              <div className="profile-form-grid">
                <FormField className="profile-field" label="显示名">
                  <TextInput
                    aria-label="显示名"
                    onChange={(event) => setDisplayName(event.currentTarget.value)}
                    value={displayName}
                  />
                </FormField>
                <FormField className="profile-field" label="邮箱">
                  <TextInput
                    aria-label="邮箱"
                    className="profile-email-input"
                    readOnly
                    title={profile.user.email}
                    value={displayEmail}
                  />
                </FormField>
                <FormField className="profile-field profile-field-wide" label="个人简介">
                  <TextareaInput
                    aria-label="个人简介"
                    onChange={(event) => setBio(event.currentTarget.value)}
                    rows={4}
                    value={bio}
                  />
                </FormField>
              </div>

              <div className="profile-settings-actions">
                <Button
                  isLoading={isSavingProfile}
                  leadingIcon={<Save size={16} strokeWidth={1.8} />}
                  loadingLabel="保存中"
                  disabled={!hasProfileChanges}
                  type="submit"
                  variant="primary"
                >
                  保存资料
                </Button>
              </div>
            </form>
          </section>

          <section className="panel workspace-card page-panel profile-settings-panel">
            <p className="panel-kicker">使用偏好</p>

            <form onSubmit={handlePreferencesSubmit}>
              {preferencesSubmitError ? (
                <p aria-label="偏好保存失败" className="error-banner" role="alert">
                  {preferencesSubmitError}
                </p>
              ) : null}
              <div className="profile-preference-list">
                <FormField
                  className="profile-setting-row"
                  description="决定界面文案与系统提示的主要语言。"
                  label="语言"
                >
                  <SelectInput
                    aria-label="语言"
                    onChange={(event) => setLocale(event.currentTarget.value as typeof locale)}
                    value={locale}
                  >
                    {userProfileOptions.locales.map((option) => (
                      <option key={option} value={option}>
                        {option === "zh-CN" ? "简体中文" : "English"}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>

                <FormField
                  className="profile-setting-row"
                  description="控制时间戳、计划发送与审计记录的显示时区。"
                  label="时区"
                >
                  <SelectInput
                    aria-label="时区"
                    onChange={(event) => setTimezone(event.currentTarget.value as typeof timezone)}
                    value={timezone}
                  >
                    {userProfileOptions.timezones.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>

                <FormField
                  className="profile-setting-row"
                  description="决定列表、详情和日志中的日期展示方式。"
                  label="日期格式"
                >
                  <SelectInput
                    aria-label="日期格式"
                    onChange={(event) => setDateFormat(event.currentTarget.value as typeof dateFormat)}
                    value={dateFormat}
                  >
                    <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                    <option value="mm-dd-yyyy">MM-DD-YYYY</option>
                    <option value="dd-mm-yyyy">DD-MM-YYYY</option>
                  </SelectInput>
                </FormField>

                <FormField
                  className="profile-setting-row"
                  description="登录后优先进入你最常使用的工作区页面。"
                  label="默认进入页"
                >
                  <SelectInput
                    aria-label="默认进入页"
                    onChange={(event) => setLandingPage(event.currentTarget.value as typeof landingPage)}
                    value={landingPage}
                  >
                    <option value="/dashboard">仪表盘</option>
                    <option value="/mail/list">邮件列表</option>
                    <option value="/api-keys">API 密钥</option>
                  </SelectInput>
                </FormField>
              </div>

              <RadioGroupField
                className="profile-density-group"
                legend="邮件阅读密度"
                name="density"
                onChange={(event) => setDensity(event.currentTarget.value as typeof density)}
                options={[
                  { label: "舒展", value: "comfortable" },
                  { label: "紧凑", value: "compact" }
                ]}
                value={density}
                variant="inline"
              />

              <div className="profile-settings-actions">
                <Button
                  isLoading={isSavingPreferences}
                  leadingIcon={<Save size={16} strokeWidth={1.8} />}
                  loadingLabel="保存中"
                  disabled={!hasPreferenceChanges}
                  type="submit"
                  variant="primary"
                >
                  保存偏好
                </Button>
              </div>
            </form>
          </section>
        </div>

        <aside aria-label="个人设置侧栏" className="profile-side-rail">
          <section className="panel workspace-card page-panel profile-settings-panel profile-rail-panel">
            <div className="profile-rail-heading">
              <UserRound size={18} strokeWidth={1.8} />
              <div>
                <p className="panel-kicker">账号状态</p>
              </div>
            </div>
            <KVList
              items={[
                { key: "角色", value: roleLabel },
                { key: "创建时间", value: formatDate(profile.user.createdAt, profile.preferences) },
                { key: "更新时间", value: formatDate(profile.user.updatedAt || profile.user.createdAt, profile.preferences) },
                { key: "偏好更新时间", value: formatDate(profile.preferences.updatedAt, profile.preferences) }
              ]}
            />
          </section>

          <section className="panel workspace-card page-panel profile-settings-panel profile-rail-panel">
            <div className="profile-rail-heading">
              <ShieldCheck size={18} strokeWidth={1.8} />
              <div>
                <p className="panel-kicker">安全与会话</p>
              </div>
            </div>

            <div className="profile-security-list">
              <div className="profile-session-list" role="list">
                {sessions.map((session) => (
                  <div className="profile-session-row" key={session.id} role="listitem">
                    <div className="profile-session-icon">
                      <MonitorSmartphone size={16} strokeWidth={1.8} />
                    </div>
                    <div className="profile-session-copy">
                      <strong>
                        {formatSessionDevice(session)}
                        {session.isCurrent ? <Badge variant="success">当前</Badge> : null}
                      </strong>
                      <span>最近活跃 {formatDateTime(session.lastSeenAt, profile.preferences)}</span>
                      <small>
                        {session.ipAddress ?? "未知 IP"} · 到期{" "}
                        {session.expiresAt ? formatDateTime(session.expiresAt, profile.preferences) : "未知"}
                      </small>
                    </div>
                    <Button
                      aria-label={session.isCurrent ? "当前会话请使用退出当前设备" : `撤销会话 ${formatSessionDevice(session)}`}
                      disabled={session.isCurrent || isRevokingSession || !onRevokeSession}
                      leadingIcon={<Trash2 size={15} strokeWidth={1.8} />}
                      onClick={() => void onRevokeSession?.(session.id)}
                      size="xs"
                      variant="secondary"
                    >
                      撤销
                    </Button>
                  </div>
                ))}
                {sessions.length === 0 ? (
                  <div className="profile-security-row">
                    <strong>当前会话</strong>
                    <span className="profile-email-text" title={profile.user.email}>
                      {displayEmail}
                    </span>
                    <small>当前设备已通过会话认证</small>
                  </div>
                ) : null}
              </div>
              <div className="profile-security-row">
                <strong>账号状态</strong>
                <span>{profile.user.status === "active" ? "正常" : "已停用"}</span>
              </div>
            </div>

            <div className="profile-settings-actions">
              <Button
                leadingIcon={<LogOut size={16} strokeWidth={1.8} />}
                onClick={onLogoutCurrentDevice}
                variant="secondary"
              >
                退出当前设备
              </Button>
              <Button
                disabled={!hasOtherSessions || isRevokingSession || !onRevokeOtherSessions}
                isLoading={isRevokingSession}
                loadingLabel="退出中"
                onClick={() => void onRevokeOtherSessions?.()}
                variant="secondary"
              >
                退出其他设备
              </Button>
            </div>
          </section>

          <section className="panel workspace-card page-panel profile-settings-panel profile-rail-panel">
            <div className="profile-rail-heading">
              <CalendarClock size={18} strokeWidth={1.8} />
              <div>
                <p className="panel-kicker">使用偏好</p>
              </div>
            </div>
            <div className="profile-rail-preference-stack">
              <Badge aria-label={`当前时区 ${profile.preferences.timezone}`} size="md" variant="brand">
                {profile.preferences.timezone}
              </Badge>
              <Badge size="md" variant="info">
                {profile.preferences.dateFormat.toUpperCase()}
              </Badge>
              <Badge size="md" variant="success">
                {formatDensity(profile.preferences.density)}
              </Badge>
              <Badge size="md" variant="warning">
                {formatLandingPage(profile.preferences.landingPage)}
              </Badge>
            </div>
          </section>
        </aside>
      </div>
    </Page>
  );
}
