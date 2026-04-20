import { FormField, RadioGroupField, SelectInput, TextInput, TextareaInput } from "../shared/form";

type SystemProfilePageProps = {
  sessionSummary: {
    email: string;
    role: string;
    createdAtLabel: string;
  };
};

export function SystemProfilePage({ sessionSummary }: SystemProfilePageProps) {
  return (
    <main className="workspace-grid profile-settings-grid">
      <section className="panel workspace-card page-panel profile-settings-panel profile-settings-panel-identity">
        <div className="profile-settings-copy">
          <p className="panel-kicker">账号资料</p>
          <h2>你的账户信息</h2>
          <p className="section-copy">集中维护你的展示身份与基础资料，保持对外沟通时的一致性。</p>
        </div>

        <div className="profile-identity-row">
          <span className="profile-avatar" aria-hidden="true">
            W
          </span>
          <div className="profile-identity-copy">
            <strong>WeMail Admin</strong>
            <span>{sessionSummary.email}</span>
            <small>{sessionSummary.role}</small>
          </div>
        </div>

        <div className="profile-form-grid">
          <FormField className="profile-field" label="显示名">
            <TextInput aria-label="显示名" defaultValue="WeMail Admin" />
          </FormField>
          <FormField className="profile-field" label="个人简介">
            <TextareaInput aria-label="个人简介" defaultValue="Edge mail operations owner" rows={3} />
          </FormField>
          <FormField className="profile-field" label="邮箱">
            <TextInput aria-label="邮箱" disabled value={sessionSummary.email} />
          </FormField>
          <div className="profile-meta-grid">
            <div className="profile-meta-card">
              <small>角色</small>
              <strong>{sessionSummary.role}</strong>
            </div>
            <div className="profile-meta-card">
              <small>创建时间</small>
              <strong>{sessionSummary.createdAtLabel}</strong>
            </div>
          </div>
        </div>

        <div className="profile-settings-actions">
          <button className="workspace-action-button secondary" type="button">
            上传头像
          </button>
          <button className="workspace-action-button primary" type="button">
            保存资料
          </button>
        </div>
      </section>

      <section className="panel workspace-card page-panel profile-settings-panel">
        <div className="profile-settings-copy">
          <p className="panel-kicker">使用偏好</p>
          <h2>按你的工作方式来调整界面</h2>
          <p className="section-copy">这些设置会影响你进入 WeMail 后默认看到的节奏与信息密度。</p>
        </div>

        <div className="profile-preference-list">
          <FormField
            className="profile-setting-row"
            description="决定界面文案与系统提示的主要语言。"
            label="语言"
          >
            <SelectInput aria-label="语言" defaultValue="zh-CN">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </SelectInput>
          </FormField>

          <FormField
            className="profile-setting-row"
            description="控制时间戳、计划发送与审计记录的显示时区。"
            label="时区"
          >
            <SelectInput aria-label="时区" defaultValue="Asia/Shanghai">
              <option value="Asia/Shanghai">Asia/Shanghai</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="America/New_York">America/New_York</option>
            </SelectInput>
          </FormField>

          <FormField
            className="profile-setting-row"
            description="决定列表、详情和日志中的日期展示方式。"
            label="日期格式"
          >
            <SelectInput aria-label="日期格式" defaultValue="yyyy-mm-dd">
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
            <SelectInput aria-label="默认进入页" defaultValue="/dashboard">
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
          options={[
            { label: "舒展", value: "comfortable" },
            { label: "紧凑", value: "compact" }
          ]}
          defaultValue="comfortable"
          variant="inline"
        />

        <div className="profile-settings-actions">
          <button className="workspace-action-button primary" type="button">
            保存偏好
          </button>
        </div>
      </section>

      <section className="panel workspace-card page-panel profile-settings-panel">
        <div className="profile-settings-copy">
          <p className="panel-kicker">安全与会话</p>
          <h2>管理密码和当前登录状态</h2>
          <p className="section-copy">优先显示你当前的会话信息，并把高风险操作收拢到同一个动作区。</p>
        </div>

        <div className="profile-security-list">
          <div className="profile-security-row">
            <strong>当前会话</strong>
            <span>{sessionSummary.email}</span>
            <small>最近活跃：刚刚</small>
          </div>
          <div className="profile-security-row">
            <strong>安全提示</strong>
            <span>建议为管理员账号定期更新密码，并在异常活动后立即清理其他设备会话。</span>
          </div>
        </div>

        <div className="profile-settings-actions">
          <button className="workspace-action-button secondary" type="button">
            修改密码
          </button>
          <button className="workspace-action-button ghost" type="button">
            退出当前设备
          </button>
          <button className="workspace-action-button ghost" type="button">
            退出其他设备
          </button>
        </div>
      </section>
    </main>
  );
}
