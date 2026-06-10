const {
  Sidebar,
  MessageList,
  DetailPane,
  MenuBar,
  QuickPopover,
  PreferencesSheet,
  ComposeSheet,
  Toast,
  Icon,
  IconButton,
  ToolbarButton
} = window;

function filterMessages(messages, filter, query) {
  const normalizedQuery = query.trim().toLowerCase();
  return messages.filter((message) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "code" && message.type === "code") ||
      (filter === "link" && message.type === "link") ||
      (filter === "unread" && message.unread);

    if (!matchesFilter) return false;
    if (!normalizedQuery) return true;

    return [message.sender, message.from, message.subject, message.preview, message.extractionValue]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function App() {
  const [theme, setTheme] = React.useState("light");
  const [activeMailboxId, setActiveMailboxId] = React.useState(window.mailboxData[0].id);
  const [selectedMessageId, setSelectedMessageId] = React.useState(window.messageData[0].id);
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [showQuick, setShowQuick] = React.useState(false);
  const [showPreferences, setShowPreferences] = React.useState(false);
  const [showCompose, setShowCompose] = React.useState(false);
  const [showRaw, setShowRaw] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeMailbox = window.mailboxData.find((mailbox) => mailbox.id === activeMailboxId) ?? window.mailboxData[0];
  const mailboxMessages = window.messageData.filter((message) => message.mailboxId === activeMailbox.id);
  const visibleMessages = filterMessages(mailboxMessages, filter, query);
  const selectedMessage =
    visibleMessages.find((message) => message.id === selectedMessageId) ??
    mailboxMessages.find((message) => message.id === selectedMessageId) ??
    visibleMessages[0] ??
    null;

  const quickMessages = window.messageData.filter((message) => message.type !== "muted");
  const highValueCount = quickMessages.filter((message) => message.unread).length;

  function handleSelectMailbox(mailboxId) {
    const nextMessages = window.messageData.filter((message) => message.mailboxId === mailboxId);
    setActiveMailboxId(mailboxId);
    setSelectedMessageId(nextMessages[0]?.id ?? null);
    setShowRaw(false);
  }

  function handleCopy(value) {
    const text = value || "未提取";
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
    setToast({
      title: "已复制到剪贴板",
      detail: text
    });
  }

  function handleSendTest() {
    setShowCompose(false);
    setToast({
      title: "测试邮件已加入队列",
      detail: "发件箱会显示发送记录和异常状态"
    });
  }

  return (
    <div className="prototype-stage">
      <MenuBar
        quickCount={highValueCount}
        showQuick={showQuick}
        theme={theme}
        onToggleQuick={() => setShowQuick((value) => !value)}
        onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
      />
      {showQuick ? <QuickPopover messages={quickMessages} onCopy={handleCopy} /> : null}
      <main className="mac-window" data-screen-label="macos-main-window">
        <Sidebar
          activeMailboxId={activeMailbox.id}
          onOpenPreferences={() => setShowPreferences(true)}
          onSelectMailbox={handleSelectMailbox}
        />
        <section className="main">
          <div className="toolbar">
            <div className="toolbar-title">
              <Icon name="mail-check" size={18} />
              <div className="toolbar-title-copy">
                <h1>收件处理</h1>
                <span>{activeMailbox.address}</span>
              </div>
            </div>
            <div className="toolbar-actions">
              <IconButton icon="refresh-cw" label="刷新邮件" onClick={() => handleCopy("已刷新当前邮箱")} />
              <ToolbarButton icon="send" label="测试发信" onClick={() => setShowCompose(true)} />
              <ToolbarButton icon="copy" label="复制当前结果" primary onClick={() => handleCopy(selectedMessage?.extractionValue)} />
            </div>
            <div className="search-field">
              <Icon name="search" size={15} />
              <input
                aria-label="搜索邮件"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索发件人、主题或验证码"
                value={query}
              />
              {query ? <IconButton icon="x" label="清空搜索" onClick={() => setQuery("")} /> : <span></span>}
            </div>
          </div>
          <div className="workspace">
            <MessageList
              filter={filter}
              mailbox={activeMailbox}
              messages={visibleMessages}
              onFilterChange={setFilter}
              onSelectMessage={(messageId) => {
                setSelectedMessageId(messageId);
                setShowRaw(false);
              }}
              selectedMessageId={selectedMessage?.id ?? null}
            />
            <DetailPane
              message={selectedMessage}
              onCopy={handleCopy}
              onToggleRaw={() => setShowRaw((value) => !value)}
              showRaw={showRaw}
            />
          </div>
        </section>
      </main>
      {showPreferences ? <PreferencesSheet onClose={() => setShowPreferences(false)} /> : null}
      {showCompose ? <ComposeSheet onClose={() => setShowCompose(false)} onSend={handleSendTest} /> : null}
      <Toast toast={toast} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
