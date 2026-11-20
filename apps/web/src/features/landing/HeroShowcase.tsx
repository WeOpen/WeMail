import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Inbox, KeyRound, Link2, Timer } from "lucide-react";

import { buildMessageExtraction, type ExtractionResult } from "@wemail/shared";

// ---------------------------------------------------------------------------
// Hero showcase: the landing page's job is to demonstrate the product, not
// describe it. The demo card auto-plays the core loop (mail arrives → code
// extracted → copied); the playground lets visitors paste any email text and
// watch the real extraction engine (the same pure function the Worker runs)
// work client-side.
// ---------------------------------------------------------------------------

const DEMO_STEP_DURATIONS = [700, 1000, 1200, 1500, 1700];
const DEMO_FINAL_STEP = DEMO_STEP_DURATIONS.length - 1;

function useDemoStep(reducedMotion: boolean) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      setStep(DEMO_FINAL_STEP);
      return;
    }

    const advance = (current: number) => {
      const next = current >= DEMO_FINAL_STEP ? 0 : current + 1;
      setStep(next);
      window.setTimeout(() => advance(next), DEMO_STEP_DURATIONS[next]);
    };

    const timer = window.setTimeout(() => advance(0), DEMO_STEP_DURATIONS[0]);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  return reducedMotion ? DEMO_FINAL_STEP : step;
}

export function HeroDemoCard({ reducedMotion }: { reducedMotion: boolean }) {
  const step = useDemoStep(reducedMotion);

  return (
    <div aria-label="产品演示：收信与验证码提取" className="landing-demo-card" role="region">
      <div className="landing-demo-header">
        <span className="landing-demo-address" title="ops@wemail.dev">
          ops@wemail.dev
        </span>
        <span className="landing-demo-badge">
          <Inbox aria-hidden="true" size={13} strokeWidth={2} />
          收件箱
        </span>
      </div>

      <div className="landing-demo-body" data-step={step}>
        {step === 0 ? (
          <p className="landing-demo-waiting">等待新邮件…</p>
        ) : (
          <article className={step === 1 ? "landing-demo-message is-entering" : "landing-demo-message"}>
            <div className="landing-demo-message-meta">
              <strong>GitHub</strong>
              <span>刚刚</span>
            </div>
            <p className="landing-demo-subject">[WeMail] Please verify your device</p>
            <p className="landing-demo-preview">Your verification code is 482914. It expires in 10 minutes.</p>

            {step >= 2 ? (
              <div className="landing-demo-extraction">
                <span className="landing-demo-chip landing-demo-chip-code">
                  <KeyRound aria-hidden="true" size={14} strokeWidth={2} />
                  482914
                </span>
                <span className="landing-demo-expiry">
                  <Timer aria-hidden="true" size={13} strokeWidth={2} />
                  10 分钟内有效
                </span>
              </div>
            ) : null}
          </article>
        )}
      </div>

      <div className="landing-demo-footer">
        <span aria-hidden="true" className={step >= 3 ? "landing-demo-copy is-copied" : "landing-demo-copy"}>
          {step >= 3 ? <Check aria-hidden="true" size={14} strokeWidth={2.2} /> : <Copy aria-hidden="true" size={14} strokeWidth={2} />}
          {step >= 3 ? "已复制 482914" : "复制验证码"}
        </span>
        <span aria-hidden="true" className="landing-demo-dots">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}

const PLAYGROUND_SAMPLE = [
  "您的验证码为 836-592，10 分钟内有效。",
  "点击确认注册：https://app.example.com/verify?token=abc123",
  "不希望再收到？退订：https://example.com/unsubscribe"
].join("\n");

const chipKindByType: Record<string, string> = {
  auth_code: "code",
  auth_link: "link",
  service_link: "link",
  subscription_link: "link",
  other_link: "link"
};

// The shared engine labels are English ("Verification code"); the landing is
// Chinese-first, so chips display a localized label.
const chipLabelByType: Record<string, string> = {
  auth_code: "验证码",
  auth_link: "验证链接",
  service_link: "服务链接",
  subscription_link: "退订链接",
  other_link: "有用链接"
};

function PlaygroundChip({ item }: { item: ExtractionResult }) {
  const kind = chipKindByType[item.type] ?? "link";
  const isCode = kind === "code";
  const displayValue = isCode ? item.value : item.value.replace(/^https?:\/\//, "");

  return (
    <span className={isCode ? "landing-playground-chip is-code" : "landing-playground-chip"} title={item.value}>
      {isCode ? (
        <KeyRound aria-hidden="true" size={14} strokeWidth={2} />
      ) : (
        <Link2 aria-hidden="true" size={14} strokeWidth={2} />
      )}
      <span className="landing-playground-chip-label">{chipLabelByType[item.type] ?? item.label}</span>
      <strong>{displayValue}</strong>
    </span>
  );
}

export function HeroPlayground() {
  const [text, setText] = useState(PLAYGROUND_SAMPLE);
  const envelope = useMemo(() => buildMessageExtraction({ subject: "示例邮件", text }), [text]);

  return (
    <div className="landing-playground">
      <div className="landing-playground-copy">
        <p className="landing-playground-kicker">试一试</p>
        <h2 className="landing-playground-title">粘贴任意邮件文本，看提取引擎工作</h2>
        <p className="landing-playground-hint">
          这就是 Worker 收信时运行的同一个提取函数——验证码、链接分类、有效期，全部在你的浏览器里实时计算。
        </p>
      </div>
      <div className="landing-playground-panel">
        <label className="sr-only" htmlFor="landing-playground-input">
          邮件文本
        </label>
        <textarea
          id="landing-playground-input"
          onChange={(event) => setText(event.target.value)}
          rows={4}
          spellCheck={false}
          value={text}
        />
        <div aria-live="polite" className="landing-playground-results">
          {envelope.items.length > 0 ? (
            envelope.items.map((item) => <PlaygroundChip item={item} key={`${item.type}:${item.value}`} />)
          ) : (
            <span className="landing-playground-empty">没有识别到验证码或链接</span>
          )}
          {envelope.expiresHint ? (
            <span className="landing-playground-expiry">
              <Timer aria-hidden="true" size={13} strokeWidth={2} />
              {envelope.expiresHint}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
