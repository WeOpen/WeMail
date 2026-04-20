import type { WorkspaceTheme, WorkspaceThemePreference } from "../app/useWorkspaceTheme";

type SystemSettingsPageProps = {
  resolvedTheme: WorkspaceTheme;
  themePreference: WorkspaceThemePreference;
  onSelectThemePreference: (preference: WorkspaceThemePreference) => void;
};

const themeOptions: Array<{
  value: WorkspaceThemePreference;
  label: string;
  description: string;
  surfaceClassName: string;
}> = [
  {
    value: "light",
    label: "浅色模式",
    description: "明亮柔和，适合白天与高亮环境。",
    surfaceClassName: "light"
  },
  {
    value: "dark",
    label: "深色模式",
    description: "降低炫光，适合夜间或低光环境。",
    surfaceClassName: "dark"
  },
  {
    value: "system",
    label: "跟随系统",
    description: "自动跟随设备的深浅色主题设置。",
    surfaceClassName: "system"
  }
];

export function SystemSettingsPage({
  themePreference,
  onSelectThemePreference
}: SystemSettingsPageProps) {
  return (
    <main className="workspace-grid system-settings-grid">
      <section className="panel workspace-card page-panel system-settings-panel">
        <div className="system-settings-copy">
          <p className="panel-kicker">系统设置</p>
          <h2>系统设置</h2>
        </div>

        <p className="panel-kicker">主题模式</p>

        <div className="appearance-option-grid" role="list" aria-label="主题模式选项">
          {themeOptions.map((option) => (
            <button
              aria-label={option.label}
              key={option.value}
              aria-pressed={themePreference === option.value}
              className={`appearance-option-card${themePreference === option.value ? " active" : ""}`}
              onClick={() => onSelectThemePreference(option.value)}
              type="button"
            >
              <span className={`appearance-option-preview ${option.surfaceClassName}`} aria-hidden="true">
                <span className="appearance-option-preview-topbar" />
                <span className="appearance-option-preview-sidebar" />
                <span className="appearance-option-preview-canvas" />
              </span>
              <span className="appearance-option-copy">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
