const { Icon } = window;

function TrafficLights() {
  return (
    <div className="traffic-lights" aria-hidden="true">
      <span className="traffic-dot red"></span>
      <span className="traffic-dot yellow"></span>
      <span className="traffic-dot green"></span>
    </div>
  );
}

function IconButton({ icon, label, active = false, onClick }) {
  return (
    <button
      aria-label={label}
      className={active ? "icon-button is-active" : "icon-button"}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon name={icon} />
    </button>
  );
}

function ToolbarButton({ icon, label, primary = false, onClick }) {
  return (
    <button
      aria-label={label}
      className={primary ? "toolbar-button primary" : "toolbar-button"}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function SegmentedControl({ value, options, onChange }) {
  return (
    <div className="segmented" role="tablist" aria-label="消息筛选">
      {options.map((option) => (
        <button
          aria-selected={value === option.id}
          className={value === option.id ? "is-active" : ""}
          key={option.id}
          onClick={() => onChange(option.id)}
          role="tab"
          type="button"
        >
          {option.icon ? <Icon name={option.icon} size={13} /> : null}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function Sidebar({ activeMailboxId, onSelectMailbox, onOpenPreferences }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <TrafficLights />
        <IconButton icon="settings" label="偏好设置" onClick={onOpenPreferences} />
      </div>
      <div className="sidebar-scroll">
        <div className="sidebar-section">
          <div className="sidebar-heading">工作台</div>
          {window.navItems.map((item) => (
            <button className={item.id === "inbox" ? "sidebar-item is-active" : "sidebar-item"} key={item.id} type="button">
              <Icon name={item.icon} size={15} />
              <span className="sidebar-item-label">{item.label}</span>
              {item.count ? <span className="sidebar-count">{item.count}</span> : <span></span>}
            </button>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-heading">邮箱</div>
          {window.mailboxData.map((mailbox) => (
            <button
              className={mailbox.id === activeMailboxId ? "sidebar-item mailbox-item is-active" : "sidebar-item mailbox-item"}
              key={mailbox.id}
              onClick={() => onSelectMailbox(mailbox.id)}
              type="button"
            >
              <Icon name="mail" size={15} />
              <span className="mailbox-copy">
                <span className="sidebar-item-label">{mailbox.name}</span>
                <span className="mailbox-address">{mailbox.address}</span>
              </span>
              <span className="sidebar-count">{mailbox.unread}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="sidebar-footer">
        <div className="sync-card">
          <Icon name="radio" size={17} />
          <span>
            <strong>实时监听中</strong>
            <span>Cloudflare Email Routing</span>
          </span>
        </div>
      </div>
    </aside>
  );
}

function ExtractionChip({ message }) {
  const iconName = message.type === "code" ? "key-round" : message.type === "link" ? "link-2" : "minus";
  return (
    <span className={`extraction-chip ${message.type}`}>
      <Icon name={iconName} size={14} />
      <span>{message.type === "code" ? message.extractionValue : message.extractionLabel}</span>
    </span>
  );
}

function MessageRow({ message, active, onSelect }) {
  return (
    <button className={active ? "message-row is-active" : "message-row"} onClick={() => onSelect(message.id)} type="button">
      <span className="message-row-top">
        <span className="message-sender">{message.sender}</span>
        <span className="message-time">{message.time}</span>
      </span>
      <span className="message-middle">
        <ExtractionChip message={message} />
        <span className="message-status">
          {message.unread ? <Icon name="circle" size={9} /> : null}
          {message.attachments ? <Icon name="paperclip" size={12} /> : null}
        </span>
      </span>
      <span className="message-subject">{message.subject}</span>
      <span className="message-preview">{message.preview}</span>
    </button>
  );
}

function MessageList({ mailbox, messages, selectedMessageId, filter, onFilterChange, onSelectMessage }) {
  const filterOptions = [
    { id: "all", label: "全部", icon: "list-filter" },
    { id: "code", label: "验证码", icon: "key-round" },
    { id: "link", label: "链接", icon: "link-2" },
    { id: "unread", label: "未读", icon: "circle" }
  ];

  return (
    <section className="message-column" data-screen-label="message-list">
      <div className="column-head">
        <div className="mailbox-summary">
          <div>
            <h2>{mailbox.name}</h2>
            <p>{mailbox.address}</p>
          </div>
          <div className="summary-metrics">
            <span className="metric-chip">
              <strong>{mailbox.extractions}</strong>
              <span>待提取</span>
            </span>
            <span className="metric-chip">
              <strong>{messages.length}</strong>
              <span>消息</span>
            </span>
          </div>
        </div>
        <div className="filter-row">
          <SegmentedControl value={filter} options={filterOptions} onChange={onFilterChange} />
        </div>
      </div>
      <div className="message-list">
        {messages.length ? (
          messages.map((message) => (
            <MessageRow
              active={message.id === selectedMessageId}
              key={message.id}
              message={message}
              onSelect={onSelectMessage}
            />
          ))
        ) : (
          <div className="empty-state">当前条件下没有可显示的消息。</div>
        )}
      </div>
    </section>
  );
}

function DetailPane({ message, onCopy, showRaw, onToggleRaw }) {
  if (!message) {
    return (
      <section className="reader-column" data-screen-label="empty-reader">
        <div className="empty-state">选择一封邮件查看提取结果、正文和调试信息。</div>
      </section>
    );
  }

  const hasTaskValue = Boolean(message.extractionValue);
  const taskLabel = message.type === "code" ? "识别到验证码" : message.type === "link" ? "识别到登录链接" : "未识别高价值结果";

  return (
    <section className="reader-column" data-screen-label="message-detail">
      <div className="reader-head">
        <div className="reader-title">
          <h2>{message.subject}</h2>
          <div className="reader-meta">
            <span>{message.from}</span>
            <span>{message.time}</span>
            <span>{message.attachments ? `${message.attachments} 个附件` : "无附件"}</span>
          </div>
        </div>
        <div className="reader-actions">
          <IconButton icon="code-2" label="切换 JSON 视图" active={showRaw} onClick={onToggleRaw} />
          <ToolbarButton icon="external-link" label="原始邮件" onClick={() => onCopy("原始邮件链接已准备打开")} />
          <ToolbarButton icon="copy" label="复制" primary onClick={() => onCopy(message.extractionValue || message.subject)} />
        </div>
      </div>
      <div className="reader-scroll">
        <div className="task-band">
          <div className="task-band-copy">
            <span className="task-band-label">
              <Icon name={message.type === "code" ? "key-round" : message.type === "link" ? "link-2" : "search"} />
              {taskLabel}
            </span>
            <span className={message.type === "link" ? "task-value link-value" : "task-value"}>
              {hasTaskValue ? message.extractionValue : "未提取"}
            </span>
          </div>
          <div className="confidence-meter">
            <span>
              <span>置信度</span>
              <strong>{message.confidence}%</strong>
            </span>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${Math.max(message.confidence, 8)}%` }}></div>
            </div>
          </div>
        </div>
        <div className="reader-grid">
          <article className="mail-body">
            <h3>正文预览</h3>
            {showRaw ? (
              <pre>{JSON.stringify({ id: message.id, extraction: message.extractionValue, meta: message.meta }, null, 2)}</pre>
            ) : (
              message.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            )}
          </article>
          <div className="reader-side">
            <div className="meta-panel">
              <h3>提取上下文</h3>
              <dl className="kv-list">
                {Object.entries(message.meta).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="timeline-panel">
              <h3>处理链路</h3>
              <div className="timeline">
                {message.timeline.map((item) => (
                  <div className="timeline-item" key={item}>
                    <span className="timeline-dot"></span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rule-panel">
              <h3>本机行为</h3>
              <div className="rule-row">
                <span>高价值邮件通知</span>
                <span className="toggle-switch" aria-hidden="true"><span className="toggle-thumb"></span></span>
              </div>
              <div className="rule-row">
                <span>复制后标记已读</span>
                <span>开启</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MenuBar({ theme, onToggleTheme, quickCount, showQuick, onToggleQuick }) {
  return (
    <div className="desktop-menu-bar">
      <div className="menu-left">
        <span className="menu-app-name">WeMail</span>
        <span className="menu-item">File</span>
        <span className="menu-item">Message</span>
        <span className="menu-item">Rules</span>
      </div>
      <div className="menu-right">
        <button className={showQuick ? "menubar-pill is-active" : "menubar-pill"} onClick={onToggleQuick} type="button">
          <Icon name="bell" size={14} />
          <span>{quickCount} new</span>
        </button>
        <button className="menubar-pill" onClick={onToggleTheme} type="button">
          <Icon name={theme === "dark" ? "moon" : "sun"} size={14} />
          <span>{theme === "dark" ? "Dark" : "Light"}</span>
        </button>
        <span className="menu-item">09:42</span>
      </div>
    </div>
  );
}

function QuickPopover({ messages, onCopy }) {
  return (
    <div className="popover" data-screen-label="menu-bar-quick-panel">
      <div className="popover-head">
        <strong>最新可复制结果</strong>
        <Icon name="command" size={15} />
      </div>
      <div className="quick-list">
        {messages.slice(0, 4).map((message) => (
          <div className="quick-item" key={message.id}>
            <span className="quick-item-copy">
              <strong>{message.sender}</strong>
              <span>{message.subject}</span>
            </span>
            <button className="toolbar-button" onClick={() => onCopy(message.extractionValue || message.extractionLabel)} type="button">
              <span className="quick-code">{message.extractionValue || message.extractionLabel}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreferencesSheet({ onClose }) {
  return (
    <div className="sheet-backdrop" data-screen-label="preferences-sheet">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="preferences-title">
        <div className="sheet-head">
          <h2 id="preferences-title">WeMail 偏好设置</h2>
          <IconButton icon="x" label="关闭偏好设置" onClick={onClose} />
        </div>
        <div className="sheet-body">
          <div className="settings-grid">
            <div className="setting-card">
              <h3>通知策略</h3>
              <p>验证码和登录链接触发系统通知，普通邮件仅进入收件处理列表。</p>
              <div className="setting-row"><span>高价值邮件</span><strong>立即通知</strong></div>
              <div className="setting-row"><span>通知声音</span><strong>Glass</strong></div>
            </div>
            <div className="setting-card">
              <h3>复制行为</h3>
              <p>从详情页或菜单栏复制后，自动记录操作并可选标记为已读。</p>
              <div className="setting-row"><span>复制后标记已读</span><strong>开启</strong></div>
              <div className="setting-row"><span>保留剪贴板记录</span><strong>30 分钟</strong></div>
            </div>
            <div className="setting-card">
              <h3>路由与告警</h3>
              <p>异常或未匹配邮件进入发件箱异常视图，同时保留原始邮件上下文。</p>
              <div className="setting-row"><span>Webhook</span><strong>已连接</strong></div>
              <div className="setting-row"><span>Telegram</span><strong>仅失败告警</strong></div>
            </div>
            <div className="setting-card">
              <h3>桌面工作台</h3>
              <p>默认进入收件处理，消息列表优先展示提取结果而不是长主题。</p>
              <div className="setting-row"><span>默认视图</span><strong>验证码</strong></div>
              <div className="setting-row"><span>阅读密度</span><strong>紧凑</strong></div>
            </div>
          </div>
        </div>
        <div className="sheet-foot">
          <ToolbarButton icon="check" label="完成" primary onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

function ComposeSheet({ onClose, onSend }) {
  return (
    <div className="sheet-backdrop" data-screen-label="compose-sheet">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <div className="sheet-head">
          <h2 id="compose-title">发送测试邮件</h2>
          <IconButton icon="x" label="关闭发信窗口" onClick={onClose} />
        </div>
        <div className="sheet-body">
          <div className="compose-fields">
            <div className="field">
              <label htmlFor="compose-to">收件人</label>
              <input id="compose-to" defaultValue="qa-login@wemail.dev" />
            </div>
            <div className="field">
              <label htmlFor="compose-subject">主题</label>
              <input id="compose-subject" defaultValue="WeMail desktop smoke test" />
            </div>
            <div className="field">
              <label htmlFor="compose-body">正文</label>
              <textarea id="compose-body" defaultValue={"This is a test message from the macOS client prototype.\n\nExpected extraction: LOGIN LINK"}></textarea>
            </div>
          </div>
        </div>
        <div className="sheet-foot">
          <ToolbarButton icon="send" label="发送" primary onClick={onSend} />
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <Icon name="check-circle-2" size={20} />
      <span className="toast-copy">
        <strong>{toast.title}</strong>
        <span>{toast.detail}</span>
      </span>
    </div>
  );
}

Object.assign(window, {
  TrafficLights,
  IconButton,
  ToolbarButton,
  SegmentedControl,
  Sidebar,
  MessageList,
  DetailPane,
  MenuBar,
  QuickPopover,
  PreferencesSheet,
  ComposeSheet,
  Toast
});
