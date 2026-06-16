import {
  requireString,
  toRecordLike
} from "../validators";
import type {
  UserProfileDateFormat,
  UserProfileDensity,
  UserProfileLandingPage,
  UserProfileLocale,
  UserProfilePreferences,
  UserProfileTimezone,
  UserProfileUpdateInput
} from "../types";

export const userProfileOptions = {
  locales: ["zh-CN", "en-US"],
  timezones: ["Asia/Shanghai", "Asia/Tokyo", "America/New_York"],
  dateFormats: ["yyyy-mm-dd", "mm-dd-yyyy", "dd-mm-yyyy"],
  landingPages: ["/dashboard", "/mail/list", "/api-keys"],
  densities: ["comfortable", "compact"]
} as const;

export const defaultUserProfilePreferences: Omit<UserProfilePreferences, "updatedAt"> = {
  bio: "",
  locale: "zh-CN",
  timezone: "Asia/Shanghai",
  dateFormat: "yyyy-mm-dd",
  landingPage: "/dashboard",
  density: "comfortable"
};

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function requireOption<T extends string>(value: unknown, options: readonly T[], field: string): T {
  if (options.includes(value as T)) return value as T;
  throw new Error(`${field} is invalid`);
}

export function parseUserProfileUpdatePayload(input: unknown): UserProfileUpdateInput {
  const payload = toRecordLike(input);
  const preferencesInput = toRecordLike(payload.preferences);
  const preferences: UserProfileUpdateInput["preferences"] = {};
  const result: UserProfileUpdateInput = {};

  if (typeof payload.name !== "undefined") {
    result.name = requireString(payload.name, "name");
  }

  if (typeof preferencesInput.bio !== "undefined") {
    preferences.bio = readOptionalString(preferencesInput.bio) ?? "";
  }
  if (typeof preferencesInput.locale !== "undefined") {
    preferences.locale = requireOption<UserProfileLocale>(
      preferencesInput.locale,
      userProfileOptions.locales,
      "locale"
    );
  }
  if (typeof preferencesInput.timezone !== "undefined") {
    preferences.timezone = requireOption<UserProfileTimezone>(
      preferencesInput.timezone,
      userProfileOptions.timezones,
      "timezone"
    );
  }
  if (typeof preferencesInput.dateFormat !== "undefined") {
    preferences.dateFormat = requireOption<UserProfileDateFormat>(
      preferencesInput.dateFormat,
      userProfileOptions.dateFormats,
      "dateFormat"
    );
  }
  if (typeof preferencesInput.landingPage !== "undefined") {
    preferences.landingPage = requireOption<UserProfileLandingPage>(
      preferencesInput.landingPage,
      userProfileOptions.landingPages,
      "landingPage"
    );
  }
  if (typeof preferencesInput.density !== "undefined") {
    preferences.density = requireOption<UserProfileDensity>(
      preferencesInput.density,
      userProfileOptions.densities,
      "density"
    );
  }

  if (Object.keys(preferences).length > 0) {
    result.preferences = preferences;
  }

  if (!result.name && !result.preferences) {
    throw new Error("profile update is required");
  }

  return result;
}
