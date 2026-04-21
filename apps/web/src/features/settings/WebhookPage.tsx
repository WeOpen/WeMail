import { IntegrationChoiceCard, SettingsSupportCard } from "./SettingsSupport";
import { Button } from "../../shared/button";
import { CheckboxField, FormField, TextInput } from "../../shared/form";

const eventGroups = [
  {
    title: "邮件事件",
    items: ["新邮件到达", "提取结果完成", "邮件处理失败"]
  },
  {
    title: "通知事件",
    items: ["Telegram 发送成功", "Telegram 发送失败"]
  },
  {
    title: "系统事件",
    items: ["API 密钥创建", "API 密钥吊销", "配置变更"]
  }
] as const;

const sampleHeaders = [
  "Content-Type: application/json",
  "X-Wemail-Signature: sha256=...",
  "X-Wemail-Delivery-Id: dev_01H..."
].join("\n");

const samplePayload = JSON.stringify(
  {
    event: "message.received",
    occurredAt: "2026-04-17T11:30:00.000Z",
    mailboxId: "box_01H...",
    message: {
      id: "msg_01H...",
      fromAddress: "ops@example.com",
      subject: "Your verification code"
    }
  },
  null,
  2
);

export function WebhookPage() {
  return (
    <main className="workspace-grid integration-page-grid">
      <div className="integration-primary-column">
        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="workspace-card-header">
            <div className="integration-card-copy">
              <p className="panel-kicker">事件推送</p>
              <h2>Webhook 控制台</h2>
              <p className="section-copy">把 WeMail 中发生的重要事件主动推送到你的服务端点。当前先完成完整信息架构，后端接口即将开放。</p>
            </div>
            <Button disabled variant="primary">
              新增端点（即将开放）
            </Button>
          </div>

          <div className="integration-warning-banner">
            <strong>接口即将开放</strong>
            <p>你现在看到的是未来完整接入中心的页面骨架：端点、事件订阅、签名、测试和日志都会收敛到这一页。</p>
          </div>

          <div className="integration-two-up-grid">
            <section className="integration-detail-card">
              <h3>端点配置</h3>
              <FormField className="integration-field-grid" htmlFor="webhook-name" label="端点名称">
                <TextInput disabled id="webhook-name" value="Production Sync" />
              </FormField>
              <FormField className="integration-field-grid" htmlFor="webhook-url" label="Callback URL">
                <TextInput disabled id="webhook-url" value="https://example.com/hooks/wemail" />
              </FormField>
            </section>

            <section className="integration-detail-card">
              <h3>事件订阅</h3>
              <div className="integration-event-group-list">
                {eventGroups.map((group) => (
                  <article className="integration-event-group" key={group.title}>
                    <strong>{group.title}</strong>
                    <div className="integration-event-pill-list">
                      {group.items.map((item, index) => (
                        <CheckboxField
                          className="integration-event-pill"
                          defaultChecked={index < 2}
                          disabled
                          key={item}
                          label={item}
                        />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="integration-card-copy">
            <p className="panel-kicker">验证</p>
            <h3>测试与验证</h3>
            <p className="section-copy">正式开放后，你可以在这里手动发送测试事件，观察目标服务的状态码、耗时和签名校验结果。</p>
          </div>
          <div className="integration-inline-actions">
            <Button disabled variant="primary">
              发送测试事件（即将开放）
            </Button>
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="integration-card-copy">
            <p className="panel-kicker">开发者参考</p>
            <h3>Payload 示例</h3>
            <p className="section-copy">让用户在配置前就知道请求头和请求体长什么样，能明显减少接入摩擦。</p>
          </div>
          <div className="integration-code-block">
            <span>Headers</span>
            <pre>{sampleHeaders}</pre>
          </div>
          <div className="integration-code-block">
            <span>Body</span>
            <pre>{samplePayload}</pre>
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="integration-card-copy">
            <p className="panel-kicker">运行观察</p>
            <h3>投递日志</h3>
            <p className="section-copy">日志区会在接口接入后显示每次投递的状态码、耗时、重试情况以及失败原因。</p>
          </div>
          <div className="integration-empty-state compact">
            <strong>端点和日志都会在后端接口接入后出现在这里</strong>
            <p className="section-copy">当前先把测试、签名、payload 与日志结构稳定下来，避免未来继续返工导航与页面布局。</p>
          </div>
        </section>
      </div>

      <aside className="integration-secondary-column">
        <SettingsSupportCard kicker="当前状态" title="准备状态" description="在功能正式开放前，先把用户最关心的几个问题讲清楚。">
          <div className="integration-stat-list">
            <article className="integration-stat-row">
              <strong>端点管理</strong>
              <span>即将开放</span>
            </article>
            <article className="integration-stat-row">
              <strong>测试投递</strong>
              <span>即将开放</span>
            </article>
            <article className="integration-stat-row">
              <strong>投递日志</strong>
              <span>界面已预留</span>
            </article>
          </div>
        </SettingsSupportCard>

        <SettingsSupportCard kicker="签名校验" title="Signing Secret" description="Webhook 真正上线后，签名说明会是开发者最需要的旁路信息。">
          <ul className="integration-bullet-list">
            <li>每次请求都会携带签名 Header，用于校验来源。</li>
            <li>建议以 Header + 原始请求体共同参与签名验证。</li>
            <li>不要仅依赖来源 IP 判断请求可信度。</li>
          </ul>
        </SettingsSupportCard>

        <IntegrationChoiceCard current="webhook" />
      </aside>
    </main>
  );
}
