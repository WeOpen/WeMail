import type { OAuthProviderId } from "../../core/bindings";
import type { AppConfig } from "../../core/config";

export type OAuthProfile = {
  provider: OAuthProviderId;
  providerUserId: string;
  email: string;
  name: string;
  login: string | null;
};

type OAuthTokenResponse = {
  access_token?: string;
  token_type?: string;
};

type OAuthProviderRuntimeConfig = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

type OAuthProviderDefinition = {
  id: OAuthProviderId;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
};

const providerDefinitions: Record<OAuthProviderId, OAuthProviderDefinition> = {
  github: {
    id: "github",
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "user:email"]
  },
  linuxdo: {
    id: "linuxdo",
    authorizationEndpoint: "https://connect.linux.do/oauth2/authorize",
    tokenEndpoint: "https://connect.linux.do/oauth2/token",
    scopes: ["openid", "profile", "email"]
  }
};

export function isOAuthProviderId(value: string): value is OAuthProviderId {
  return value === "github" || value === "linuxdo";
}

export function getOAuthProviderConfig(config: AppConfig, provider: OAuthProviderId) {
  return config.oauth.providers[provider] ?? null;
}

export function buildOAuthAuthorizationUrl(provider: OAuthProviderId, runtimeConfig: OAuthProviderRuntimeConfig, state: string) {
  const definition = providerDefinitions[provider];
  const url = new URL(definition.authorizationEndpoint);
  url.searchParams.set("client_id", runtimeConfig.clientId);
  url.searchParams.set("redirect_uri", runtimeConfig.callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", definition.scopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string) {
  if (!response.ok) throw new Error(fallbackMessage);
  return response.json() as Promise<T>;
}

async function exchangeOAuthCode(provider: OAuthProviderId, runtimeConfig: OAuthProviderRuntimeConfig, code: string) {
  const definition = providerDefinitions[provider];
  const body = new URLSearchParams({
    client_id: runtimeConfig.clientId,
    client_secret: runtimeConfig.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: runtimeConfig.callbackUrl
  });

  const tokenResponse = await fetch(definition.tokenEndpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });
  const payload = await readJsonResponse<OAuthTokenResponse>(tokenResponse, "OAuth token exchange failed");
  if (!payload.access_token) throw new Error("OAuth token exchange failed");
  return payload.access_token;
}

async function fetchGithubProfile(accessToken: string): Promise<OAuthProfile> {
  const user = await readJsonResponse<{ id?: number | string; login?: string; name?: string | null }>(
    await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${accessToken}`,
        "user-agent": "WeMail"
      }
    }),
    "GitHub profile fetch failed"
  );
  const emails = await readJsonResponse<Array<{ email?: string; primary?: boolean; verified?: boolean }>>(
    await fetch("https://api.github.com/user/emails", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${accessToken}`,
        "user-agent": "WeMail"
      }
    }),
    "GitHub email fetch failed"
  );
  const email = emails.find((entry) => entry.primary && entry.verified)?.email ?? emails.find((entry) => entry.verified)?.email;
  if (!user.id || !email) throw new Error("GitHub verified email is required");
  const login = user.login ?? null;

  return {
    provider: "github",
    providerUserId: String(user.id),
    email,
    name: user.name?.trim() || login || email.split("@")[0] || email,
    login
  };
}

async function fetchLinuxDoProfile(accessToken: string): Promise<OAuthProfile> {
  const user = await readJsonResponse<{
    sub?: string;
    id?: string | number;
    username?: string;
    login?: string;
    name?: string | null;
    email?: string;
  }>(
    await fetch("https://connect.linux.do/api/user", {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`
      }
    }),
    "LinuxDo profile fetch failed"
  );
  const providerUserId = user.sub ?? (user.id ? String(user.id) : "");
  const email = user.email?.trim();
  if (!providerUserId || !email) throw new Error("LinuxDo email is required");
  const login = user.username ?? user.login ?? null;

  return {
    provider: "linuxdo",
    providerUserId,
    email,
    name: user.name?.trim() || login || email.split("@")[0] || email,
    login
  };
}

export async function fetchOAuthProfile(provider: OAuthProviderId, runtimeConfig: OAuthProviderRuntimeConfig, code: string) {
  const accessToken = await exchangeOAuthCode(provider, runtimeConfig, code);
  return provider === "github" ? fetchGithubProfile(accessToken) : fetchLinuxDoProfile(accessToken);
}
