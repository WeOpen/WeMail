export type WemailToastTone = "success" | "error" | "info";

export type WemailToastInput = {
  message: string;
  tone?: WemailToastTone;
  durationMs?: number | null;
  dismissible?: boolean;
};

export type WemailToastRecord = {
  id: string;
  message: string;
  tone: WemailToastTone;
  durationMs: number | null;
  dismissible: boolean;
};

function resolveDuration(tone: WemailToastTone) {
  return tone === "error" ? null : 3000;
}

function resolveDismissible(tone: WemailToastTone) {
  return tone === "error";
}

export function createToast(input: WemailToastInput): WemailToastRecord {
  const tone = input.tone ?? "success";

  return {
    id: crypto.randomUUID(),
    message: input.message,
    tone,
    durationMs: input.durationMs === undefined ? resolveDuration(tone) : input.durationMs,
    dismissible: input.dismissible ?? resolveDismissible(tone)
  };
}