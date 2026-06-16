import { parseUserProfileUpdatePayload } from "@wemail/shared";

export async function parseUserProfileUpdateRequest(request: Request) {
  return parseUserProfileUpdatePayload(await request.json());
}
