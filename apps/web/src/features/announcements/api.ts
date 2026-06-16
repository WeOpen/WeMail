import { apiFetch } from "../../shared/api/client";

export type AnnouncementItem = {
  id: string;
  title: string;
  summary: string;
  type: string;
  status: string;
  audience: string;
  priority: string;
  author: string;
  tags: string[];
  pinned: boolean;
  startAt?: string | null;
  endAt?: string | null;
  acknowledgedAt?: string | null;
  receiptStatus?: "已签收" | "未签收";
  receiptSummary?: {
    signed: number;
    unsigned: number;
  };
  publishedAt: string;
  updatedAt: string;
};

export type AnnouncementListPayload = {
  announcements?: AnnouncementItem[];
  featuredAnnouncements?: AnnouncementItem[];
  page?: number;
  pageSize?: number;
  summary?: AnnouncementSummaryItem[];
  total?: number;
};

export type AnnouncementSummaryItem = {
  label: string;
  value: number;
};

export type AnnouncementListOptions = {
  page: number;
  pageSize: number;
  q?: string;
  scope?: "manage";
  status?: string;
  time?: "7d" | "30d";
  type?: string;
};

export type AnnouncementCreatePayload = {
  title: string;
  summary: string;
  type: string;
  status: string;
  audience: string;
  priority: string;
  tags: string[];
  pinned: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

export type AnnouncementUpdatePayload = Partial<AnnouncementCreatePayload>;

export async function fetchAnnouncements(options: AnnouncementListOptions) {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize)
  });
  if (options.q) params.set("q", options.q);
  if (options.scope) params.set("scope", options.scope);
  if (options.status) params.set("status", options.status);
  if (options.time) params.set("time", options.time);
  if (options.type) params.set("type", options.type);

  return apiFetch<AnnouncementListPayload>(`/api/announcements?${params.toString()}`);
}

export async function fetchAnnouncement(id: string, options?: { scope?: "manage" }) {
  const params = new URLSearchParams();
  if (options?.scope) params.set("scope", options.scope);
  const queryString = params.toString();

  return apiFetch<{ announcement: AnnouncementItem }>(
    `/api/announcements/${encodeURIComponent(id)}${queryString ? `?${queryString}` : ""}`
  );
}

export async function createAnnouncement(payload: AnnouncementCreatePayload) {
  return apiFetch<{ announcement: AnnouncementItem }>("/api/announcements", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAnnouncement(id: string, payload: AnnouncementUpdatePayload) {
  return apiFetch<{ announcement: AnnouncementItem }>(`/api/announcements/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteAnnouncement(id: string) {
  await apiFetch<void>(`/api/announcements/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function acknowledgeAnnouncement(id: string) {
  return apiFetch<{ announcement: AnnouncementItem }>(`/api/announcements/${encodeURIComponent(id)}/receipt`, {
    method: "POST"
  });
}
