import type { ApiClient } from "./client";

export type ScoreBreakdown = {
  discipline: number;
  organization: number;
  cashFlow: number;
  engagement: number;
};

export type OnChainScore = {
  total: number;
  breakdown: ScoreBreakdown;
  lastUpdatedAt: number;
  attestor: string;
  onChainAddress: string;
};

export type AttestedScore = OnChainScore & {
  signature: string;
};

export function getMyScore(client: ApiClient): Promise<OnChainScore> {
  return client.get<OnChainScore>("/score/me");
}

export function attestMyScore(client: ApiClient): Promise<AttestedScore> {
  return client.post<AttestedScore>("/score/attest", {});
}
