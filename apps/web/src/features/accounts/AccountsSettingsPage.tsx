import { useEffect, useState, type ReactNode } from "react";
import {
  ArchiveRestore,
  CheckCircle2,
  ClipboardCheck,
  LockKeyhole,
  Save,
  ShieldAlert,
  ShieldCheck,
  Tags
} from "lucide-react";
import {
  defaultAccountPolicy,
  type AccountCreationStatus,
  type AccountInactiveAction,
  type AccountPolicy,
  type AccountPolicyUpdateInput
} from "@wemail/shared";

import { Badge } from "../../shared/badge";
import { Button } from "../../shared/button";
import { FormField, SelectInput, TextInput } from "../../shared/form";
import { OverlayDialog } from "../../shared/overlay";
import { Page } from "../../shared/page-layout";
import { Switch } from "../../shared/switch";
import { fetchAccountPolicy, updateAccountPolicy } from "./api";

type PolicySectionKey = "creation" | "lifecycle" | "protection";

const statusLabels: Record<AccountCreationStatus, string> = {
  enabled: "启用",
  disabled: "停用",
  archived: "已归档"
};

const inactiveActionLabels: Record<AccountInactiveAction, string> = {
  mark: "仅标记",
  disable: "自动停用",
  archive: "自动归档"
};

type PolicySectionProps = {
  actionLabel: string;
  badge: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  kicker: string;
  onSave: () => void;
  saved: boolean;
  savedLabel: string;
  saving?: boolean;
  title: string;
};

type SwitchRowProps = {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  tone?: "default" | "danger";
};

function PolicySection({
  actionLabel,
  badge,
  children,
  disabled,
  icon,
  kicker,
  onSave,
  saved,
  savedLabel,
  saving,
  title
}: PolicySectionProps) {
  return (
    <section className="panel workspace-card page-panel accounts-settings-section">
      <div className="accounts-settings-section-head">
        <div className="accounts-settings-section-title">
          <span className="accounts-settings-section-icon" aria-hidden="true">
            {icon}
          </span>
          <div>
            <p className="panel-kicker">{kicker}</p>
            <h2>{title}</h2>
          </div>
        </div>
        {badge}
      </div>

      <div className="accounts-settings-control-grid">{children}</div>

      <div className="accounts-settings-section-actions">
        {saved ? (
          <p className="accounts-settings-save-state" role="status">
            <CheckCircle2 size={15} strokeWidth={1.9} aria-hidden="true" />
            {savedLabel}
          </p>
        ) : null}
        <Button
          disabled={disabled}
          isLoading={saving}
          leadingIcon={<Save size={16} strokeWidth={1.9} aria-hidden="true" />}
          loadingLabel="保存中"
          onClick={onSave}
          variant="primary"
        >
          {saving ? "保存中" : actionLabel}
        </Button>
      </div>
    </section>
  );
}

function SwitchRow({ checked, description, disabled, label, onChange, tone = "default" }: SwitchRowProps) {
  return (
    <div className={`accounts-settings-switch-row accounts-settings-switch-row-${tone}`}>
      <div className="accounts-settings-switch-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
      <Switch aria-label={label} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

export function AccountsSettingsPage() {
  const [defaultTagsEnabled, setDefaultTagsEnabled] = useState(defaultAccountPolicy.creation.defaultTagsEnabled);
  const [defaultTags, setDefaultTags] = useState(defaultAccountPolicy.creation.defaultTags);
  const [allowCreationOverride, setAllowCreationOverride] = useState(defaultAccountPolicy.creation.allowCreationOverride);
  const [defaultStatus, setDefaultStatus] = useState<AccountCreationStatus>(defaultAccountPolicy.creation.defaultStatus);
  const [requireCreatorNote, setRequireCreatorNote] = useState(defaultAccountPolicy.creation.requireCreatorNote);
  const [creationSaved, setCreationSaved] = useState(false);

  const [inactiveDays, setInactiveDays] = useState(defaultAccountPolicy.lifecycle.inactiveDays);
  const [inactiveAction, setInactiveAction] = useState<AccountInactiveAction>(defaultAccountPolicy.lifecycle.inactiveAction);
  const [softDeleteRetentionDays, setSoftDeleteRetentionDays] = useState(defaultAccountPolicy.lifecycle.softDeleteRetentionDays);
  const [allowHardDelete, setAllowHardDelete] = useState(defaultAccountPolicy.lifecycle.allowHardDelete);
  const [requireSoftDeleteBeforeHardDelete, setRequireSoftDeleteBeforeHardDelete] = useState(
    defaultAccountPolicy.lifecycle.requireSoftDeleteBeforeHardDelete
  );
  const [savedAllowHardDelete, setSavedAllowHardDelete] = useState(defaultAccountPolicy.lifecycle.allowHardDelete);
  const [lifecycleSaved, setLifecycleSaved] = useState(false);
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);

  const [confirmStandardBulkActions, setConfirmStandardBulkActions] = useState(
    defaultAccountPolicy.protection.confirmStandardBulkActions
  );
  const [standardBulkLimit, setStandardBulkLimit] = useState(defaultAccountPolicy.protection.standardBulkLimit);
  const [requireDangerPhrase, setRequireDangerPhrase] = useState(defaultAccountPolicy.protection.requireDangerPhrase);
  const [hardDeleteLimit, setHardDeleteLimit] = useState(defaultAccountPolicy.protection.hardDeleteLimit);
  const [auditLoggingEnabled, setAuditLoggingEnabled] = useState(defaultAccountPolicy.protection.auditLoggingEnabled);
  const [protectionSaved, setProtectionSaved] = useState(false);

  const [lastUpdatedLabel, setLastUpdatedLabel] = useState(defaultAccountPolicy.lastUpdatedLabel);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<PolicySectionKey | null>(null);

  const protectionLevel = allowHardDelete
    ? "高风险模式"
    : requireDangerPhrase && confirmStandardBulkActions && auditLoggingEnabled
      ? "强保护"
      : "基础保护";
  const creationMode = defaultTagsEnabled ? "默认标签已启用" : "手动标签";
  const hardDeleteLabel = allowHardDelete ? "允许" : "关闭";
  const saveStateLabel = isLoadingPolicy
    ? "加载中"
    : creationSaved || lifecycleSaved || protectionSaved
      ? "本次会话有更新"
      : "等待调整";
  const isBusy = isLoadingPolicy || savingSection !== null;
  const controlsDisabled = isBusy || Boolean(loadError);

  function applyPolicy(policy: AccountPolicy) {
    setDefaultTagsEnabled(policy.creation.defaultTagsEnabled);
    setDefaultTags(policy.creation.defaultTags);
    setAllowCreationOverride(policy.creation.allowCreationOverride);
    setDefaultStatus(policy.creation.defaultStatus);
    setRequireCreatorNote(policy.creation.requireCreatorNote);
    setInactiveDays(policy.lifecycle.inactiveDays);
    setInactiveAction(policy.lifecycle.inactiveAction);
    setSoftDeleteRetentionDays(policy.lifecycle.softDeleteRetentionDays);
    setAllowHardDelete(policy.lifecycle.allowHardDelete);
    setSavedAllowHardDelete(policy.lifecycle.allowHardDelete);
    setRequireSoftDeleteBeforeHardDelete(policy.lifecycle.requireSoftDeleteBeforeHardDelete);
    setConfirmStandardBulkActions(policy.protection.confirmStandardBulkActions);
    setStandardBulkLimit(policy.protection.standardBulkLimit);
    setRequireDangerPhrase(policy.protection.requireDangerPhrase);
    setHardDeleteLimit(policy.protection.hardDeleteLimit);
    setAuditLoggingEnabled(policy.protection.auditLoggingEnabled);
    setLastUpdatedLabel(policy.lastUpdatedLabel);
  }

  useEffect(() => {
    let cancelled = false;

    setIsLoadingPolicy(true);
    setLoadError(null);
    void fetchAccountPolicy()
      .then((payload) => {
        if (cancelled) return;
        applyPolicy(payload.policy);
      })
      .catch(() => {
        if (!cancelled) setLoadError("账号策略加载失败");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPolicy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function savePolicyPatch(section: PolicySectionKey, payload: AccountPolicyUpdateInput) {
    if (savingSection) return null;
    setSavingSection(section);
    setSaveError(null);
    try {
      const result = await updateAccountPolicy(payload);
      applyPolicy(result.policy);
      return result.policy;
    } catch {
      setSaveError("账号策略保存失败");
      return null;
    } finally {
      setSavingSection(null);
    }
  }

  function saveCreationRules() {
    void (async () => {
      const policy = await savePolicyPatch("creation", {
        creation: {
          defaultTagsEnabled,
          defaultTags,
          allowCreationOverride,
          defaultStatus,
          requireCreatorNote
        }
      });
      if (policy) {
        setCreationSaved(true);
      }
    })();
  }

  function saveLifecycleRules() {
    if (allowHardDelete && !savedAllowHardDelete) {
      setShowDangerConfirm(true);
      return;
    }

    void (async () => {
      const policy = await savePolicyPatch("lifecycle", {
        lifecycle: {
          inactiveDays,
          inactiveAction,
          softDeleteRetentionDays,
          allowHardDelete,
          requireSoftDeleteBeforeHardDelete
        }
      });
      if (policy) {
        setLifecycleSaved(true);
      }
    })();
  }

  function confirmDangerousLifecycleChange() {
    void (async () => {
      const policy = await savePolicyPatch("lifecycle", {
        lifecycle: {
          inactiveDays,
          inactiveAction,
          softDeleteRetentionDays,
          allowHardDelete,
          requireSoftDeleteBeforeHardDelete
        }
      });
      if (policy) {
        setLifecycleSaved(true);
        setShowDangerConfirm(false);
      }
    })();
  }

  function cancelDangerousLifecycleChange() {
    setAllowHardDelete(savedAllowHardDelete);
    setShowDangerConfirm(false);
  }

  function saveProtectionRules() {
    void (async () => {
      const policy = await savePolicyPatch("protection", {
        protection: {
          confirmStandardBulkActions,
          standardBulkLimit,
          requireDangerPhrase,
          hardDeleteLimit,
          auditLoggingEnabled
        }
      });
      if (policy) {
        setProtectionSaved(true);
      }
    })();
  }

  return (
    <>
      <Page as="main" className="workspace-grid accounts-settings-grid accounts-settings-page">
        <section aria-label="账号设置概览" className="panel workspace-card page-panel accounts-settings-overview-panel">
          <div className="accounts-settings-overview-copy">
            <div className="accounts-settings-overview-icon" aria-hidden="true">
              <ShieldCheck size={24} strokeWidth={1.9} />
            </div>
            <div>
              <p className="panel-kicker">账号中心</p>
              <h1>账号策略中心</h1>
              <div className="accounts-settings-overview-badges">
                <Badge variant="brand">{creationMode}</Badge>
                <Badge variant={allowHardDelete ? "danger" : "success"}>{protectionLevel}</Badge>
              </div>
            </div>
          </div>

          <div aria-label="账号设置关键指标" className="accounts-settings-metric-grid" role="list">
            <div aria-label="默认创建状态" className="accounts-settings-metric-card" role="listitem">
              <Tags size={18} strokeWidth={1.9} aria-hidden="true" />
              <span>默认创建状态</span>
              <strong>{statusLabels[defaultStatus]}</strong>
            </div>
            <div aria-label="不活跃处理阈值" className="accounts-settings-metric-card" role="listitem">
              <ArchiveRestore size={18} strokeWidth={1.9} aria-hidden="true" />
              <span>不活跃处理阈值</span>
              <strong>{inactiveDays} 天</strong>
            </div>
            <div aria-label="彻底删除状态" className="accounts-settings-metric-card" role="listitem">
              <LockKeyhole size={18} strokeWidth={1.9} aria-hidden="true" />
              <span>彻底删除状态</span>
              <strong>{hardDeleteLabel}</strong>
            </div>
          </div>
        </section>

        {loadError ? (
          <p className="section-copy" role="alert">
            {loadError}
          </p>
        ) : null}
        {saveError ? (
          <p className="section-copy" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="accounts-settings-content-grid">
          <div aria-label="账号策略表单" className="accounts-settings-main-column">
            <PolicySection
              actionLabel="保存默认创建规则"
              badge={<Badge variant={defaultTagsEnabled ? "success" : "neutral"}>{creationMode}</Badge>}
              disabled={controlsDisabled}
              icon={<Tags size={19} strokeWidth={1.9} />}
              kicker="创建规则"
              onSave={saveCreationRules}
              saved={creationSaved}
              savedLabel="默认创建规则已保存"
              saving={savingSection === "creation"}
              title="默认创建规则"
            >
              <SwitchRow
                checked={defaultTagsEnabled}
                description="新账号创建后自动带上统一运营标签。"
                disabled={controlsDisabled}
                label="自动附加默认标签"
                onChange={(checked) => {
                  setDefaultTagsEnabled(checked);
                  setCreationSaved(false);
                }}
              />

              <FormField className="accounts-settings-field" label="默认标签">
                <TextInput
                  disabled={controlsDisabled}
                  onChange={(event) => {
                    setDefaultTags(event.target.value);
                    setCreationSaved(false);
                  }}
                  type="text"
                  value={defaultTags}
                />
              </FormField>

              <FormField className="accounts-settings-field" label="默认状态">
                <SelectInput
                  disabled={controlsDisabled}
                  onChange={(event) => {
                    setDefaultStatus(event.target.value as AccountCreationStatus);
                    setCreationSaved(false);
                  }}
                  value={defaultStatus}
                >
                  <option value="enabled">{statusLabels.enabled}</option>
                  <option value="disabled">{statusLabels.disabled}</option>
                  <option value="archived">{statusLabels.archived}</option>
                </SelectInput>
              </FormField>

              <SwitchRow
                checked={allowCreationOverride}
                description="创建账号时可按业务场景调整默认标签。"
                disabled={controlsDisabled}
                label="允许创建时覆盖默认标签"
                onChange={(checked) => {
                  setAllowCreationOverride(checked);
                  setCreationSaved(false);
                }}
              />

              <SwitchRow
                checked={requireCreatorNote}
                description="要求创建人留下用途说明，便于后续审计。"
                disabled={controlsDisabled}
                label="创建账号时要求备注"
                onChange={(checked) => {
                  setRequireCreatorNote(checked);
                  setCreationSaved(false);
                }}
              />
            </PolicySection>

            <PolicySection
              actionLabel="保存生命周期规则"
              badge={<Badge variant={allowHardDelete ? "danger" : "info"}>{inactiveActionLabels[inactiveAction]}</Badge>}
              disabled={controlsDisabled}
              icon={<ArchiveRestore size={19} strokeWidth={1.9} />}
              kicker="生命周期"
              onSave={saveLifecycleRules}
              saved={lifecycleSaved}
              savedLabel="生命周期规则已保存"
              saving={savingSection === "lifecycle"}
              title="生命周期规则"
            >
              <div className="accounts-settings-field-grid">
                <FormField className="accounts-settings-field" label="不活跃阈值（天）">
                  <TextInput
                    disabled={controlsDisabled}
                    min={1}
                    onChange={(event) => {
                      setInactiveDays(Number(event.target.value));
                      setLifecycleSaved(false);
                    }}
                    type="number"
                    value={inactiveDays}
                  />
                </FormField>

                <FormField className="accounts-settings-field" label="不活跃后动作">
                  <SelectInput
                    disabled={controlsDisabled}
                    onChange={(event) => {
                      setInactiveAction(event.target.value as AccountInactiveAction);
                      setLifecycleSaved(false);
                    }}
                    value={inactiveAction}
                  >
                    <option value="mark">{inactiveActionLabels.mark}</option>
                    <option value="disable">{inactiveActionLabels.disable}</option>
                    <option value="archive">{inactiveActionLabels.archive}</option>
                  </SelectInput>
                </FormField>

                <FormField className="accounts-settings-field" label="软删除保留期（天）">
                  <TextInput
                    disabled={controlsDisabled}
                    min={1}
                    onChange={(event) => {
                      setSoftDeleteRetentionDays(Number(event.target.value));
                      setLifecycleSaved(false);
                    }}
                    type="number"
                    value={softDeleteRetentionDays}
                  />
                </FormField>
              </div>

              <SwitchRow
                checked={allowHardDelete}
                description="启用后允许执行不可恢复的彻底删除。"
                disabled={controlsDisabled}
                label="允许彻底删除"
                onChange={(checked) => {
                  setAllowHardDelete(checked);
                  setLifecycleSaved(false);
                }}
                tone="danger"
              />

              <SwitchRow
                checked={requireSoftDeleteBeforeHardDelete}
                description="彻底删除前先进入软删除保留期。"
                disabled={controlsDisabled}
                label="彻底删除前必须先软删除"
                onChange={(checked) => {
                  setRequireSoftDeleteBeforeHardDelete(checked);
                  setLifecycleSaved(false);
                }}
              />
            </PolicySection>

            <PolicySection
              actionLabel="保存批量操作保护"
              badge={<Badge variant={requireDangerPhrase ? "success" : "warning"}>{protectionLevel}</Badge>}
              disabled={controlsDisabled}
              icon={<ShieldAlert size={19} strokeWidth={1.9} />}
              kicker="操作保护"
              onSave={saveProtectionRules}
              saved={protectionSaved}
              savedLabel="批量操作保护已保存"
              saving={savingSection === "protection"}
              title="批量操作保护"
            >
              <SwitchRow
                checked={confirmStandardBulkActions}
                description="普通批量操作提交前仍显示确认弹窗。"
                disabled={controlsDisabled}
                label="普通批量操作显示确认弹窗"
                onChange={(checked) => {
                  setConfirmStandardBulkActions(checked);
                  setProtectionSaved(false);
                }}
              />

              <div className="accounts-settings-field-grid">
                <FormField className="accounts-settings-field" label="单次普通批量操作上限">
                  <TextInput
                    disabled={controlsDisabled}
                    min={1}
                    onChange={(event) => {
                      setStandardBulkLimit(Number(event.target.value));
                      setProtectionSaved(false);
                    }}
                    type="number"
                    value={standardBulkLimit}
                  />
                </FormField>

                <FormField className="accounts-settings-field" label="单次彻底删除上限">
                  <TextInput
                    disabled={controlsDisabled}
                    min={1}
                    onChange={(event) => {
                      setHardDeleteLimit(Number(event.target.value));
                      setProtectionSaved(false);
                    }}
                    type="number"
                    value={hardDeleteLimit}
                  />
                </FormField>
              </div>

              <SwitchRow
                checked={requireDangerPhrase}
                description="危险操作必须输入确认词后才能继续。"
                disabled={controlsDisabled}
                label="危险操作要求确认词"
                onChange={(checked) => {
                  setRequireDangerPhrase(checked);
                  setProtectionSaved(false);
                }}
              />

              <SwitchRow
                checked={auditLoggingEnabled}
                description="批量操作写入审计日志，便于追踪责任人。"
                disabled={controlsDisabled}
                label="记录批量操作日志"
                onChange={(checked) => {
                  setAuditLoggingEnabled(checked);
                  setProtectionSaved(false);
                }}
              />
            </PolicySection>
          </div>

          <aside aria-label="账号策略侧栏" className="accounts-settings-side-rail">
            <section className="panel workspace-card page-panel accounts-settings-rail-panel">
              <div className="accounts-settings-rail-heading">
                <ClipboardCheck size={19} strokeWidth={1.9} aria-hidden="true" />
                <div>
                  <p className="panel-kicker">策略状态</p>
                  <h2>策略运行状态</h2>
                </div>
              </div>

              <dl className="accounts-settings-summary-list">
                <div className="accounts-settings-summary-row">
                  <dt>默认状态</dt>
                  <dd>{statusLabels[defaultStatus]}</dd>
                </div>
                <div className="accounts-settings-summary-row">
                  <dt>默认标签</dt>
                  <dd>{defaultTagsEnabled ? defaultTags : "未启用默认标签"}</dd>
                </div>
                <div className="accounts-settings-summary-row">
                  <dt>不活跃处理</dt>
                  <dd>{`${inactiveDays} 天后${inactiveActionLabels[inactiveAction]}`}</dd>
                </div>
                <div className="accounts-settings-summary-row">
                  <dt>软删除保留期</dt>
                  <dd>{`${softDeleteRetentionDays} 天`}</dd>
                </div>
                <div className="accounts-settings-summary-row">
                  <dt>危险操作保护</dt>
                  <dd>{requireDangerPhrase ? "确认词 + 二次确认" : "仅确认弹窗"}</dd>
                </div>
                <div className="accounts-settings-summary-row">
                  <dt>最近更新时间</dt>
                  <dd>{lastUpdatedLabel}</dd>
                </div>
              </dl>
            </section>

            <section className="panel workspace-card page-panel accounts-settings-rail-panel">
              <div className="accounts-settings-rail-heading">
                <ShieldCheck size={19} strokeWidth={1.9} aria-hidden="true" />
                <div>
                  <p className="panel-kicker">保护强度</p>
                  <h2>{protectionLevel}</h2>
                </div>
              </div>

              <div className="accounts-settings-rail-list">
                <div className="accounts-settings-rail-row">
                  <span>普通批量上限</span>
                  <strong>{standardBulkLimit} 个</strong>
                </div>
                <div className="accounts-settings-rail-row">
                  <span>彻底删除上限</span>
                  <strong>{hardDeleteLimit} 个</strong>
                </div>
                <div className="accounts-settings-rail-row">
                  <span>保存状态</span>
                  <strong>{saveStateLabel}</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </Page>

      {showDangerConfirm ? (
        <OverlayDialog closeLabel="关闭危险策略确认" eyebrow="危险策略" onClose={cancelDangerousLifecycleChange} title="确认危险策略变更">
          <p className="section-copy">开启“允许彻底删除”会让高风险批量动作可用，请确认这是你要对全局邮箱账号策略做出的调整。</p>
          <div className="workspace-dialog-actions">
            <Button onClick={cancelDangerousLifecycleChange} variant="secondary">
              取消
            </Button>
            <Button onClick={confirmDangerousLifecycleChange} variant="danger">
              确认危险策略变更
            </Button>
          </div>
        </OverlayDialog>
      ) : null}
    </>
  );
}
