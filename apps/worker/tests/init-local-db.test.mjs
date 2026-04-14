import { describe, expect, it, vi } from "vitest";

import { createInviteSeedSql, resolveInviteCode, runLocalDbInit } from "../scripts/init-local-db.mjs";

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

describe("init local db script", () => {
  it("prefers an explicit invite code from argv", () => {
    expect(resolveInviteCode(["--invite-code", "LOCAL-INVITE"], () => "IGNORED")).toBe("LOCAL-INVITE");
    expect(resolveInviteCode(["--invite-code=LOCAL-INVITE-2"], () => "IGNORED")).toBe("LOCAL-INVITE-2");
  });

  it("falls back to a generated invite code when argv omits one", () => {
    expect(resolveInviteCode([], () => "GENERATED-CODE")).toBe("GENERATED-CODE");
  });

  it("builds idempotent seed sql for the invite", () => {
    const sql = createInviteSeedSql({
      inviteId: "invite-1",
      inviteCode: "O'HARA",
      createdAt: "2026-04-14T00:00:00.000Z"
    });

    expect(sql).toContain("INSERT OR IGNORE INTO invites");
    expect(sql).toContain("'invite-1'");
    expect(sql).toContain("'O''HARA'");
    expect(sql).toContain("'2026-04-14T00:00:00.000Z'");
  });

  it("executes schema, seed, and verify steps in order", () => {
    const spawnSyncImpl = vi.fn(() => ({ status: 0, stdout: "ok", stderr: "" }));
    const writeFileSyncImpl = vi.fn();
    const rmSyncImpl = vi.fn();
    const mkdirSyncImpl = vi.fn();
    const log = vi.fn();

    const result = runLocalDbInit({
      argv: ["--invite-code", "LOCAL-INVITE"],
      workerRoot: "D:/repo/apps/worker",
      tempDir: "D:/repo/apps/worker/.tmp",
      spawnSyncImpl,
      writeFileSyncImpl,
      rmSyncImpl,
      mkdirSyncImpl,
      log,
      randomUUIDImpl: () => "invite-uuid",
      nowImpl: () => new Date("2026-04-14T00:00:00.000Z")
    });

    expect(result.inviteCode).toBe("LOCAL-INVITE");
    expect(writeFileSyncImpl).toHaveBeenCalledTimes(2);
    expect(mkdirSyncImpl).toHaveBeenCalledWith("D:/repo/apps/worker/.tmp", { recursive: true });
    expect(spawnSyncImpl).toHaveBeenCalledTimes(3);

    expect(spawnSyncImpl.mock.calls[0][0]).toBe("pnpm");
    expect(spawnSyncImpl.mock.calls[0][1]).toEqual([
      "exec",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--file",
      expect.any(String)
    ]);
    expect(normalizePath(spawnSyncImpl.mock.calls[0][1][7])).toBe("D:/repo/apps/worker/src/infrastructure/db/schema.sql");
    expect(spawnSyncImpl.mock.calls[0][2]).toEqual(expect.objectContaining({ cwd: "D:/repo/apps/worker" }));

    expect(spawnSyncImpl.mock.calls[1][0]).toBe("pnpm");
    expect(spawnSyncImpl.mock.calls[1][1]).toEqual([
      "exec",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--file",
      expect.any(String)
    ]);
    expect(normalizePath(spawnSyncImpl.mock.calls[1][1][7])).toBe("D:/repo/apps/worker/.tmp/local-invite.sql");
    expect(spawnSyncImpl.mock.calls[1][2]).toEqual(expect.objectContaining({ cwd: "D:/repo/apps/worker" }));

    expect(spawnSyncImpl.mock.calls[2][0]).toBe("pnpm");
    expect(spawnSyncImpl.mock.calls[2][1]).toEqual([
      "exec",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--file",
      expect.any(String)
    ]);
    expect(normalizePath(spawnSyncImpl.mock.calls[2][1][7])).toBe("D:/repo/apps/worker/.tmp/verify-invite.sql");
    expect(spawnSyncImpl.mock.calls[2][2]).toEqual(expect.objectContaining({ cwd: "D:/repo/apps/worker" }));

    expect(normalizePath(rmSyncImpl.mock.calls[0][0])).toBe("D:/repo/apps/worker/.tmp/local-invite.sql");
    expect(rmSyncImpl.mock.calls[0][1]).toEqual({ force: true });
    expect(normalizePath(rmSyncImpl.mock.calls[1][0])).toBe("D:/repo/apps/worker/.tmp/verify-invite.sql");
    expect(rmSyncImpl.mock.calls[1][1]).toEqual({ force: true });
    expect(log).toHaveBeenCalled();
  });
});
