import { createApp, processInboundEmail, runCleanup } from "./app/create-app";
import type { AppBindings } from "./core/bindings";
import { createD1Store } from "./infrastructure/persistence/d1";
import { processNotificationOutbox } from "./app/services/notification-outbox-service";

const app = createApp();

export default {
  fetch: app.fetch,
  async email(message: { to: string; raw: ReadableStream<Uint8Array> }, env: AppBindings, context: ExecutionContext) {
    if (!env.DB) return;
    await processInboundEmail(env, createD1Store(env.DB), message, { deferNotifications: (work) => context.waitUntil(work) });
  },
  async scheduled(controller: ScheduledController, env: AppBindings) {
    if (!env.DB) return;
    const store = createD1Store(env.DB);
    await processNotificationOutbox(store, env);
    if (controller.cron === "0 * * * *") await runCleanup(store, env);
  }
};
