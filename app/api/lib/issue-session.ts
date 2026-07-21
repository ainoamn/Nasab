import { signSessionToken } from "../kimi/session";
import { getUserSessionVersion } from "../queries/users";

export async function issueSessionForUser(
  userId: number,
  unionId: string,
  clientId: string,
) {
  const sessionVersion = await getUserSessionVersion(userId);
  return signSessionToken({ unionId, clientId, sessionVersion });
}
