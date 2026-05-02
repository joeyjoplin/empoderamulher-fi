/**
 * Shared API contract types between the frontend and the backend Node service.
 * Mirrors the domain types in `backend/src/types/domain.ts`. Manually kept in
 * sync during the hackathon — would be Zod-generated in production.
 */

export type BackendPersona = {
  id: string;
  name: string;
  businessType: string;
  city: string | null;
  monthlyRevenueAvg: string;
  stage: number;
  walletPubkey: string | null;
};

export type ApiSuccess<T> = { data: T };

export type ApiFailure = {
  error: {
    code: string;
    message?: string;
  };
};
