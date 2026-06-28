import type { ApiKeyScope, FeatureToggles } from "@wemail/shared";

import type { AppBindings, AppStore } from "../core/bindings";

export type AppVariables = {
  user: { id: string; email: string; role: "admin" | "member" } | null;
  authMode: "session" | "apiKey" | "anonymous";
  sessionId: string | null;
  apiKeyScopes: ApiKeyScope[];
  store: AppStore;
  featureToggles: FeatureToggles;
};

export type AppContext = { Bindings: AppBindings; Variables: AppVariables };

export function requireUser(c: { get: <T>(key: string) => T }) {
  return c.get<AppVariables["user"]>("user");
}

export function requireSessionAuth(c: { get: <T>(key: string) => T }) {
  return c.get<AppVariables["authMode"]>("authMode") === "session";
}

export function getAppServices(c: { get: <T>(key: string) => T; env: AppBindings }) {
  return {
    store: c.get<AppStore>("store"),
    featureToggles: c.get<FeatureToggles>("featureToggles"),
    env: c.env
  };
}
