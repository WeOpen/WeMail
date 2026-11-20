import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSummary, UserProfileSummary } from "@wemail/shared";

import { fetchProfileSessions, fetchUserProfile, updateUserProfile } from "../features/settings/api";
import { useProfileData } from "../features/settings/useProfileData";

vi.mock("../features/settings/api", () => ({
  fetchProfileSessions: vi.fn(), fetchUserProfile: vi.fn(), updateUserProfile: vi.fn(),
  revokeProfileSession: vi.fn(), revokeOtherProfileSessions: vi.fn()
}));

const profile: UserProfileSummary = {
  user: { id: "member-1", email: "member@example.com", name: "Backend Profile", role: "member", status: "active", createdAt: "2026-04-08T00:00:00.000Z", updatedAt: "2026-04-09T00:00:00.000Z" },
  preferences: { bio: "Loaded from backend", locale: "en-US", timezone: "Asia/Tokyo", dateFormat: "dd-mm-yyyy", landingPage: "/mail/list", density: "compact", updatedAt: "2026-04-09T00:00:00.000Z" }
};
const session: SessionSummary = {
  user: profile.user,
  featureToggles: { aiEnabled: true, telegramEnabled: true, outboundEnabled: true, mailboxCreationEnabled: true }
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

describe("profile request ordering", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fetchProfileSessions).mockResolvedValue({ sessions: [] });
  });

  it("does not replace a successful save with a profile read started before that save", async () => {
    const oldRead = deferred<{ profile: UserProfileSummary }>();
    const saved = { ...profile, user: { ...profile.user, name: "Route Renamed" } };
    vi.mocked(fetchUserProfile).mockResolvedValueOnce({ profile }).mockReturnValueOnce(oldRead.promise);
    vi.mocked(updateUserProfile).mockResolvedValue({ profile: saved });
    const { result } = renderHook(() => useProfileData({ session, onSessionUpdated: vi.fn(), onToast: vi.fn() }));
    await act(() => result.current.refreshProfileData());
    let refresh!: Promise<void>;
    act(() => { refresh = result.current.refreshProfileData(); });
    await act(() => result.current.saveProfile({ name: "Route Renamed" }));
    expect(result.current.profile?.user.name).toBe("Route Renamed");
    await act(async () => { oldRead.resolve({ profile }); await refresh; });
    expect(result.current.profile?.user.name).toBe("Route Renamed");
  });

  it("ignores reads started during an in-flight save even when they resolve after the save", async () => {
    const pendingSave = deferred<{ profile: UserProfileSummary }>();
    const concurrentRead = deferred<{ profile: UserProfileSummary }>();
    const saved = { ...profile, preferences: { ...profile.preferences, bio: "Saved biography" } };
    vi.mocked(fetchUserProfile).mockResolvedValueOnce({ profile }).mockReturnValueOnce(concurrentRead.promise);
    vi.mocked(updateUserProfile).mockReturnValueOnce(pendingSave.promise);
    const { result } = renderHook(() => useProfileData({ session, onSessionUpdated: vi.fn(), onToast: vi.fn() }));
    await act(() => result.current.refreshProfileData());
    let save!: Promise<void>;
    let read!: Promise<void>;
    act(() => { save = result.current.saveProfile({ preferences: { bio: "Saved biography" } }); });
    act(() => { read = result.current.refreshProfileData(); });
    await act(async () => { pendingSave.resolve({ profile: saved }); await save; });
    await act(async () => { concurrentRead.resolve({ profile }); await read; });
    expect(result.current.profile?.preferences.bio).toBe("Saved biography");
    expect(result.current.isLoadingProfile).toBe(false);
  });

  it("does not rehydrate a signed-out account when its pending profile read finishes", async () => {
    const pendingRead = deferred<{ profile: UserProfileSummary }>();
    vi.mocked(fetchUserProfile).mockReturnValueOnce(pendingRead.promise);
    const { result, rerender } = renderHook(({ currentSession }: { currentSession: SessionSummary | null }) => useProfileData({ session: currentSession, onSessionUpdated: vi.fn(), onToast: vi.fn() }), { initialProps: { currentSession: session as SessionSummary | null } });
    let read!: Promise<void>;
    act(() => { read = result.current.refreshProfileData(); });
    rerender({ currentSession: null });
    await act(async () => { pendingRead.resolve({ profile }); await read; });
    expect(result.current.profile).toBeNull();
    expect(result.current.hasLoadedProfile).toBe(false);
  });

  it("rejects a second profile or preference write until the first finishes", async () => {
    const pendingSave = deferred<{ profile: UserProfileSummary }>();
    vi.mocked(updateUserProfile).mockReturnValueOnce(pendingSave.promise).mockResolvedValue({ profile });
    const { result } = renderHook(() => useProfileData({ session, onSessionUpdated: vi.fn(), onToast: vi.fn() }));
    let firstSave!: Promise<void>;
    act(() => { firstSave = result.current.saveProfile({ name: "First save" }); });
    await act(async () => {
      await expect(result.current.saveProfile({ name: "Duplicate save" })).rejects.toThrow("已有个人设置正在保存");
      await expect(result.current.savePreferences({ preferences: { bio: "Second save" } })).rejects.toThrow("已有个人设置正在保存");
    });
    expect(updateUserProfile).toHaveBeenCalledTimes(1);
    expect(result.current.isSavingProfile).toBe(true);
    await act(async () => { pendingSave.resolve({ profile }); await firstSave; });
    await act(() => result.current.savePreferences({ preferences: { bio: "Second save" } }));
    expect(updateUserProfile).toHaveBeenCalledTimes(2);
  });

  it("does not let a previous account write invalidate the new account profile read", async () => {
    const oldSave = deferred<{ profile: UserProfileSummary }>();
    const newRead = deferred<{ profile: UserProfileSummary }>();
    const nextProfile = { ...profile, user: { ...profile.user, id: "member-2", name: "Second account" } };
    const nextSession = { ...session, user: nextProfile.user };
    const onSessionUpdated = vi.fn();
    const onToast = vi.fn();
    vi.mocked(updateUserProfile).mockReturnValueOnce(oldSave.promise);
    vi.mocked(fetchUserProfile).mockReturnValueOnce(newRead.promise);
    const { result, rerender } = renderHook(({ currentSession }) => useProfileData({ session: currentSession, onSessionUpdated, onToast }), { initialProps: { currentSession: session } });
    let save!: Promise<void>;
    let read!: Promise<void>;
    act(() => { save = result.current.saveProfile({ name: "Old account update" }); });
    rerender({ currentSession: nextSession });
    act(() => { read = result.current.refreshProfileData(); });
    await act(async () => { oldSave.resolve({ profile }); await save; });
    await act(async () => { newRead.resolve({ profile: nextProfile }); await read; });
    expect(result.current.profile?.user.id).toBe("member-2");
    expect(result.current.isLoadingProfile).toBe(false);
    expect(result.current.isSavingProfile).toBe(false);
    expect(onSessionUpdated).not.toHaveBeenCalled();
  });
});
