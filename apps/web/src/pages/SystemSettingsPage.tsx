import {
  Globe2,
  MonitorCog,
  MoonStar,
  Palette,
  ShieldCheck,
  SunMedium,
  type LucideIcon
} from "lucide-react";

import type { WorkspaceTheme, WorkspaceThemePreference } from "../app/useWorkspaceTheme";
import { SystemDomainSettingsPanel } from "../features/settings/SystemDomainSettingsPanel";
import { Badge } from "../shared/badge";
import { Button } from "../shared/button";
import { Page } from "../shared/page-layout";

type SystemSettingsPageProps = {
  canManageDomains?: boolean;
  resolvedTheme: WorkspaceTheme;
  themePreference: WorkspaceThemePreference;
  onSelectThemePreference: (preference: WorkspaceThemePreference) => void;
};

const themeOptions: Array<{
  value: WorkspaceThemePreference;
  label: string;
  description: string;
  icon: LucideIcon;
  surfaceClassName: string;
}> = [
  {
    value: "light",
    label: "浅色模式",
    description: "高亮界面",
    icon: SunMedium,
    surfaceClassName: "light"
  },
  {
    value: "dark",
    label: "深色模式",
    description: "低光界面",
    icon: MoonStar,
    surfaceClassName: "dark"
  },
  {
    value: "system",
    label: "跟随系统",
    description: "系统同步",
    icon: MonitorCog,
    surfaceClassName: "system"
  }
];

function formatThemePreference(preference: WorkspaceThemePreference) {
  if (preference === "light") return "浅色模式";
  if (preference === "dark") return "深色模式";
  return "跟随系统";
}

function formatResolvedTheme(theme: WorkspaceTheme) {
  return theme === "dark" ? "深色" : "浅色";
}

export function SystemSettingsPage({
  canManageDomains = false,
  resolvedTheme,
  themePreference,
  onSelectThemePreference
}: SystemSettingsPageProps) {
  const themePreferenceLabel = formatThemePreference(themePreference);
  const resolvedThemeLabel = formatResolvedTheme(resolvedTheme);
  const domainPermissionLabel = canManageDomains ? "可管理" : "仅查看";

  return (
    <Page as="main" className="workspace-grid system-settings-grid system-settings-page">
      <section aria-label="系统设置概览" className="panel workspace-card page-panel system-settings-overview-panel">
        <div className="system-settings-overview-copy">
          <div className="system-settings-overview-icon" aria-hidden="true">
            <MonitorCog size={24} strokeWidth={1.8} />
          </div>
          <div>
            <p className="panel-kicker">系统设置</p>
            <h1>系统控制台</h1>
            <div className="system-settings-overview-badges">
              <Badge variant={resolvedTheme === "dark" ? "info" : "warning"}>{resolvedThemeLabel}界面</Badge>
              <Badge variant={canManageDomains ? "brand" : "neutral"}>
                {canManageDomains ? "域名可管理" : "只读权限"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="system-settings-summary-grid" role="list">
          <div aria-label="当前主题模式" className="system-settings-summary-card" role="listitem">
            <Palette size={18} strokeWidth={1.8} />
            <span>当前主题模式</span>
            <strong>{themePreferenceLabel}</strong>
          </div>
          <div aria-label="当前解析主题" className="system-settings-summary-card" role="listitem">
            <MoonStar size={18} strokeWidth={1.8} />
            <span>当前解析主题</span>
            <strong>{resolvedThemeLabel}</strong>
          </div>
          <div aria-label="域名管理权限" className="system-settings-summary-card" role="listitem">
            <ShieldCheck size={18} strokeWidth={1.8} />
            <span>域名管理权限</span>
            <strong>{domainPermissionLabel}</strong>
          </div>
        </div>
      </section>

      <div className="system-settings-content-grid">
        <div aria-label="系统设置主设置" className="system-settings-main-column">
          <section className="panel workspace-card page-panel system-settings-panel">
            <div className="system-settings-section-head">
              <div>
                <p className="panel-kicker">主题模式</p>
                <h2>外观</h2>
              </div>
              <Badge variant="info">{themePreferenceLabel}</Badge>
            </div>

            <div className="appearance-option-grid" role="list" aria-label="主题模式选项">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = themePreference === option.value;

                return (
                  <Button
                    aria-label={option.label}
                    aria-pressed={isActive}
                    className={`appearance-option-card${isActive ? " active" : ""}`}
                    contentLayout="plain"
                    isActive={isActive}
                    key={option.value}
                    onClick={() => onSelectThemePreference(option.value)}
                    variant="text"
                  >
                    <span className={`appearance-option-preview ${option.surfaceClassName}`} aria-hidden="true">
                      <span className="appearance-option-preview-topbar" />
                      <span className="appearance-option-preview-sidebar" />
                      <span className="appearance-option-preview-canvas" />
                    </span>
                    <span className="appearance-option-copy">
                      <span className="appearance-option-title">
                        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                        <strong>{option.label}</strong>
                      </span>
                      <small>{option.description}</small>
                    </span>
                  </Button>
                );
              })}
            </div>
          </section>
          {canManageDomains ? <SystemDomainSettingsPanel /> : null}
        </div>

        <aside aria-label="系统设置状态侧栏" className="system-settings-side-rail">
          <section className="panel workspace-card page-panel system-settings-rail-panel">
            <div className="system-settings-rail-heading">
              <Palette size={19} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <p className="panel-kicker">当前外观</p>
                <h2>{resolvedThemeLabel}界面</h2>
              </div>
            </div>
            <div className="system-settings-rail-list">
              <div className="system-settings-rail-row">
                <span>偏好</span>
                <strong>{themePreferenceLabel}</strong>
              </div>
              <div className="system-settings-rail-row">
                <span>解析</span>
                <strong>{resolvedThemeLabel}</strong>
              </div>
            </div>
          </section>

          <section className="panel workspace-card page-panel system-settings-rail-panel">
            <div className="system-settings-rail-heading">
              <Globe2 size={19} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <p className="panel-kicker">域名权限</p>
                <h2>{domainPermissionLabel}</h2>
              </div>
            </div>
            <div className="system-settings-rail-list">
              <div className="system-settings-rail-row">
                <span>管理范围</span>
                <strong>{canManageDomains ? "邮箱域名" : "系统外观"}</strong>
              </div>
              <div className="system-settings-rail-row">
                <span>状态</span>
                <strong>{canManageDomains ? "已开放" : "只读"}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Page>
  );
}
