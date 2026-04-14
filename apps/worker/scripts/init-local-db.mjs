import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = dirname(scriptPath);
const defaultWorkerRoot = resolve(scriptDir, "..");
const defaultTempDir = join(defaultWorkerRoot, ".tmp");

function escapeSqlString(value) {
  return value.replaceAll("'", "''");
}

function defaultInviteCodeFactory(randomUUIDImpl = randomUUID) {
  return `INVITE-${randomUUIDImpl().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export function resolveInviteCode(argv, fallbackFactory = () => defaultInviteCodeFactory()) {
  const explicitFlag = argv.find((arg) => arg.startsWith("--invite-code="));
  if (explicitFlag) {
    return explicitFlag.slice("--invite-code=".length);
  }

  const inviteCodeIndex = argv.findIndex((arg) => arg === "--invite-code");
  if (inviteCodeIndex >= 0) {
    const inviteCode = argv[inviteCodeIndex + 1];
    if (!inviteCode) {
      throw new Error("Missing value for --invite-code");
    }
    return inviteCode;
  }

  return fallbackFactory();
}

export function createInviteSeedSql({ inviteId, inviteCode, createdAt }) {
  return [
    "INSERT OR IGNORE INTO invites (",
    "  id,",
    "  code,",
    "  created_by_user_id,",
    "  redeemed_by_user_id,",
    "  redeemed_at,",
    "  disabled_at,",
    "  created_at",
    ") VALUES (",
    `  '${escapeSqlString(inviteId)}',`,
    `  '${escapeSqlString(inviteCode)}',`,
    "  NULL,",
    "  NULL,",
    "  NULL,",
    "  NULL,",
    `  '${escapeSqlString(createdAt)}'`,
    ");"
  ].join("\n");
}

export function createInviteVerifySql(inviteCode) {
  return `SELECT code, redeemed_at, disabled_at FROM invites WHERE code = '${escapeSqlString(inviteCode)}';`;
}

function formatCommandError(step, result) {
  const stdout = `${result.stdout ?? ""}`.trim();
  const stderr = `${result.stderr ?? ""}`.trim();
  const details = [stdout, stderr].filter(Boolean).join("\n");
  return details ? `${step} failed.\n${details}` : `${step} failed.`;
}

function runWranglerStep({ workerRoot, spawnSyncImpl, step, args }) {
  const result = spawnSyncImpl("pnpm", args, {
    cwd: workerRoot,
    shell: process.platform === "win32",
    encoding: "utf8"
  });

  if ((result.status ?? 1) !== 0) {
    throw new Error(formatCommandError(step, result));
  }

  return result;
}

export function runLocalDbInit({
  argv = process.argv.slice(2),
  workerRoot = defaultWorkerRoot,
  tempDir = defaultTempDir,
  spawnSyncImpl = spawnSync,
  writeFileSyncImpl = writeFileSync,
  rmSyncImpl = rmSync,
  mkdirSyncImpl = mkdirSync,
  log = console.log,
  randomUUIDImpl = randomUUID,
  nowImpl = () => new Date()
} = {}) {
  const inviteCode = resolveInviteCode(argv, () => defaultInviteCodeFactory(randomUUIDImpl));
  const schemaPath = join(workerRoot, "src", "infrastructure", "db", "schema.sql");
  const seedFilePath = join(tempDir, "local-invite.sql");
  const verifyFilePath = join(tempDir, "verify-invite.sql");
  const seedSql = createInviteSeedSql({
    inviteId: randomUUIDImpl(),
    inviteCode,
    createdAt: nowImpl().toISOString()
  });
  const verifySql = createInviteVerifySql(inviteCode);

  mkdirSyncImpl(tempDir, { recursive: true });
  writeFileSyncImpl(seedFilePath, seedSql, "utf8");
  writeFileSyncImpl(verifyFilePath, verifySql, "utf8");

  try {
    runWranglerStep({
      workerRoot,
      spawnSyncImpl,
      step: "Applying worker schema.sql to local D1",
      args: ["exec", "wrangler", "d1", "execute", "DB", "--local", "--file", schemaPath]
    });

    runWranglerStep({
      workerRoot,
      spawnSyncImpl,
      step: "Seeding local invite code",
      args: ["exec", "wrangler", "d1", "execute", "DB", "--local", "--file", seedFilePath]
    });

    const verifyResult = runWranglerStep({
      workerRoot,
      spawnSyncImpl,
      step: "Verifying seeded invite code",
      args: ["exec", "wrangler", "d1", "execute", "DB", "--local", "--file", verifyFilePath]
    });

    log(`Local D1 initialized. Invite code: ${inviteCode}`);

    const verifyOutput = `${verifyResult.stdout ?? ""}`.trim();
    if (verifyOutput) {
      log(verifyOutput);
    }

    return {
      inviteCode,
      schemaPath,
      seedFilePath,
      verifyFilePath,
      verifyOutput
    };
  } finally {
    rmSyncImpl(seedFilePath, { force: true });
    rmSyncImpl(verifyFilePath, { force: true });
  }
}

const isMain = process.argv[1] ? resolve(process.argv[1]) === scriptPath : false;

if (isMain) {
  try {
    runLocalDbInit();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
