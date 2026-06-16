import { describe, expect, it } from "vitest";

import { consumeApiCallQuota } from "../src/app/services/quota-service";
import { createInMemoryStore } from "../src/infrastructure/persistence/in-memory";
import { workerTestEnv } from "./helpers/test-env";

describe("quota service", () => {
  it("allows only one concurrent API quota consumer when one daily call remains", async () => {
    const store = createInMemoryStore();
    const user = await store.users.create({
      email: "quota@example.com",
      name: "Quota",
      passwordHash: "hash",
      role: "member"
    });

    await store.quotas.save({
      userId: user.id,
      dailyLimit: 20,
      sendsToday: 0,
      apiDailyLimit: 1,
      apiCallsToday: 0,
      disabled: false,
      updatedAt: new Date().toISOString()
    });

    const results = await Promise.all([
      consumeApiCallQuota(store, workerTestEnv, user.id),
      consumeApiCallQuota(store, workerTestEnv, user.id)
    ]);

    expect(results.filter((result) => result instanceof Response)).toHaveLength(1);
    expect(results.filter((result) => !(result instanceof Response))).toHaveLength(1);
  });
});
