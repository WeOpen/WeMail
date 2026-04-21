import { useState } from "react";

import { Button } from "../../shared/button";
import { CheckboxField, FormField, SelectInput, TextInput } from "../../shared/form";
import { OverlayDialog } from "../../shared/overlay";
import { mailboxAccountPolicyMock } from "./accountsMockData";

export function AccountsSettingsPage() {
  const [defaultTagsEnabled, setDefaultTagsEnabled] = useState(mailboxAccountPolicyMock.creation.defaultTagsEnabled);
  const [defaultTags, setDefaultTags] = useState(mailboxAccountPolicyMock.creation.defaultTags);
  const [allowCreationOverride, setAllowCreationOverride] = useState(mailboxAccountPolicyMock.creation.allowCreationOverride);
  const [defaultStatus, setDefaultStatus] = useState(mailboxAccountPolicyMock.creation.defaultStatus);
  const [requireCreatorNote, setRequireCreatorNote] = useState(mailboxAccountPolicyMock.creation.requireCreatorNote);
  const [creationSaved, setCreationSaved] = useState(false);

  const [inactiveDays, setInactiveDays] = useState(mailboxAccountPolicyMock.lifecycle.inactiveDays);
  const [inactiveAction, setInactiveAction] = useState(mailboxAccountPolicyMock.lifecycle.inactiveAction);
  const [softDeleteRetentionDays, setSoftDeleteRetentionDays] = useState(mailboxAccountPolicyMock.lifecycle.softDeleteRetentionDays);
  const [allowHardDelete, setAllowHardDelete] = useState(mailboxAccountPolicyMock.lifecycle.allowHardDelete);
  const [requireSoftDeleteBeforeHardDelete, setRequireSoftDeleteBeforeHardDelete] = useState(
    mailboxAccountPolicyMock.lifecycle.requireSoftDeleteBeforeHardDelete
  );
  const [savedAllowHardDelete, setSavedAllowHardDelete] = useState(mailboxAccountPolicyMock.lifecycle.allowHardDelete);
  const [lifecycleSaved, setLifecycleSaved] = useState(false);
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);

  const [confirmStandardBulkActions, setConfirmStandardBulkActions] = useState(
    mailboxAccountPolicyMock.protection.confirmStandardBulkActions
  );
  const [standardBulkLimit, setStandardBulkLimit] = useState(mailboxAccountPolicyMock.protection.standardBulkLimit);
  const [requireDangerPhrase, setRequireDangerPhrase] = useState(mailboxAccountPolicyMock.protection.requireDangerPhrase);
  const [hardDeleteLimit, setHardDeleteLimit] = useState(mailboxAccountPolicyMock.protection.hardDeleteLimit);
  const [auditLoggingEnabled, setAuditLoggingEnabled] = useState(mailboxAccountPolicyMock.protection.auditLoggingEnabled);
  const [protectionSaved, setProtectionSaved] = useState(false);

  const [lastUpdatedLabel, setLastUpdatedLabel] = useState(mailboxAccountPolicyMock.lastUpdatedLabel);

  function markUpdated() {
    setLastUpdatedLabel("刚刚更新");
  }

  function saveCreationRules() {
    setCreationSaved(true);
    markUpdated();
  }

  function saveLifecycleRules() {
    if (allowHardDelete && !savedAllowHardDelete) {
      setShowDangerConfirm(true);
      return;
    }

    setSavedAllowHardDelete(allowHardDelete);
    setLifecycleSaved(true);
    markUpdated();
  }

  function confirmDangerousLifecycleChange() {
    setSavedAllowHardDelete(allowHardDelete);
    setLifecycleSaved(true);
    setShowDangerConfirm(false);
    markUpdated();
  }

  function cancelDangerousLifecycleChange() {
    setAllowHardDelete(savedAllowHardDelete);
    setShowDangerConfirm(false);
  }

  function saveProtectionRules() {
    setProtectionSaved(true);
    markUpdated();
  }

  return (
    <>
      <main className="workspace-grid integration-page-grid accounts-settings-page">
        <div className="integration-primary-column">
          <section className="panel workspace-card page-panel integration-surface-card accounts-settings-intro-card">
            <div className="workspace-card-header">
              <div className="integration-card-copy">
                <p className="panel-kicker">账号中心</p>
                <h2>账号设置</h2>
                <p className="section-copy">为所有邮箱账号定义默认创建规则、生命周期规则与批量操作保护，先以 mock-first 方式固化全局策略中心结构。</p>
              </div>
            </div>
          </section>

          <section className="panel workspace-card page-panel integration-surface-card accounts-settings-section">
            <p className="panel-kicker">创建规则</p>
            <h3>默认创建规则</h3>

            <CheckboxField
              checked={defaultTagsEnabled}
              label="自动附加默认标签"
              onChange={(event) => {
                setDefaultTagsEnabled(event.target.checked);
                setCreationSaved(false);
              }}
            />

            <FormField label="默认标签">
              <TextInput
                onChange={(event) => {
                  setDefaultTags(event.target.value);
                  setCreationSaved(false);
                }}
                type="text"
                value={defaultTags}
              />
            </FormField>

            <FormField label="默认状态">
              <SelectInput
                onChange={(event) => {
                  setDefaultStatus(event.target.value as typeof defaultStatus);
                  setCreationSaved(false);
                }}
                value={defaultStatus}
              >
                <option value="启用">启用</option>
                <option value="停用">停用</option>
                <option value="待审核">待审核</option>
              </SelectInput>
            </FormField>

            <CheckboxField
              checked={allowCreationOverride}
              label="允许创建时覆盖默认标签"
              onChange={(event) => {
                setAllowCreationOverride(event.target.checked);
                setCreationSaved(false);
              }}
            />

            <CheckboxField
              checked={requireCreatorNote}
              label="创建账号时要求备注"
              onChange={(event) => {
                setRequireCreatorNote(event.target.checked);
                setCreationSaved(false);
              }}
            />

            <Button onClick={saveCreationRules} variant="primary">
              保存默认创建规则
            </Button>
            {creationSaved ? <p role="status">默认创建规则已保存</p> : null}
          </section>

          <section className="panel workspace-card page-panel integration-surface-card accounts-settings-section">
            <p className="panel-kicker">生命周期</p>
            <h3>生命周期规则</h3>

            <FormField label="不活跃阈值（天）">
              <TextInput
                min={1}
                onChange={(event) => {
                  setInactiveDays(Number(event.target.value));
                  setLifecycleSaved(false);
                }}
                type="number"
                value={inactiveDays}
              />
            </FormField>

            <FormField label="不活跃后动作">
              <SelectInput
                onChange={(event) => {
                  setInactiveAction(event.target.value as typeof inactiveAction);
                  setLifecycleSaved(false);
                }}
                value={inactiveAction}
              >
                <option value="仅标记">仅标记</option>
                <option value="自动停用">自动停用</option>
                <option value="自动归档">自动归档</option>
              </SelectInput>
            </FormField>

            <FormField label="软删除保留期（天）">
              <TextInput
                min={1}
                onChange={(event) => {
                  setSoftDeleteRetentionDays(Number(event.target.value));
                  setLifecycleSaved(false);
                }}
                type="number"
                value={softDeleteRetentionDays}
              />
            </FormField>

            <CheckboxField
              aria-label="允许彻底删除"
              checked={allowHardDelete}
              label="允许彻底删除"
              onChange={(event) => {
                setAllowHardDelete(event.target.checked);
                setLifecycleSaved(false);
              }}
            />

            <CheckboxField
              checked={requireSoftDeleteBeforeHardDelete}
              label="彻底删除前必须先软删除"
              onChange={(event) => {
                setRequireSoftDeleteBeforeHardDelete(event.target.checked);
                setLifecycleSaved(false);
              }}
            />

            <Button onClick={saveLifecycleRules} variant="primary">
              保存生命周期规则
            </Button>
            {lifecycleSaved ? <p role="status">生命周期规则已保存</p> : null}
          </section>

          <section className="panel workspace-card page-panel integration-surface-card accounts-settings-section">
            <p className="panel-kicker">操作保护</p>
            <h3>批量操作保护</h3>

            <CheckboxField
              checked={confirmStandardBulkActions}
              label="普通批量操作显示确认弹窗"
              onChange={(event) => {
                setConfirmStandardBulkActions(event.target.checked);
                setProtectionSaved(false);
              }}
            />

            <FormField label="单次普通批量操作上限">
              <TextInput
                min={1}
                onChange={(event) => {
                  setStandardBulkLimit(Number(event.target.value));
                  setProtectionSaved(false);
                }}
                type="number"
                value={standardBulkLimit}
              />
            </FormField>

            <CheckboxField
              checked={requireDangerPhrase}
              label="危险操作要求确认词"
              onChange={(event) => {
                setRequireDangerPhrase(event.target.checked);
                setProtectionSaved(false);
              }}
            />

            <FormField label="单次彻底删除上限">
              <TextInput
                min={1}
                onChange={(event) => {
                  setHardDeleteLimit(Number(event.target.value));
                  setProtectionSaved(false);
                }}
                type="number"
                value={hardDeleteLimit}
              />
            </FormField>

            <CheckboxField
              checked={auditLoggingEnabled}
              label="记录批量操作日志"
              onChange={(event) => {
                setAuditLoggingEnabled(event.target.checked);
                setProtectionSaved(false);
              }}
            />

            <Button onClick={saveProtectionRules} variant="primary">
              保存批量操作保护
            </Button>
            {protectionSaved ? <p role="status">批量操作保护已保存</p> : null}
          </section>
        </div>

        <aside className="integration-secondary-column">
          <section className="panel workspace-card page-panel integration-side-card accounts-settings-summary-card">
          <p className="panel-kicker">策略摘要</p>
          <h3>当前策略摘要</h3>
          <dl className="accounts-settings-summary-list">
            <div className="accounts-settings-summary-row">
              <dt>默认状态</dt>
              <dd>{defaultStatus}</dd>
            </div>
            <div className="accounts-settings-summary-row">
              <dt>默认标签</dt>
              <dd>{defaultTagsEnabled ? defaultTags : "未启用默认标签"}</dd>
            </div>
            <div className="accounts-settings-summary-row">
              <dt>不活跃处理</dt>
              <dd>{`${inactiveDays} 天后${inactiveAction}`}</dd>
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
        </aside>
      </main>

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
