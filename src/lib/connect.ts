/** ChuckTown Connect is a separate app. Northstar does not write to that repo. */
export const CONNECT_ORIGIN = "https://connect.chucktownhomes.com";
export const CONNECT_REPO = "ChuckTownHomesMarketing/chucktownconnect";

export type EmbedMode = "full" | "embed";

export function embedModeFromHeader(value: string | null): EmbedMode {
  return value === "1" ? "embed" : "full";
}

/**
 * Future signed handoff from Connect.
 * v1 always returns null. Connect should link to Northstar and the person signs in with Google.
 * A later version can verify a short-lived token and open the same allowlisted session.
 */
export type ConnectHandoffClaims = {
  email: string;
  issuedAt: number;
  expiresAt: number;
  source: "chucktown-connect";
};

export function acceptConnectHandoff(token: string): ConnectHandoffClaims | null {
  if (!token) return null;
  return null;
}
