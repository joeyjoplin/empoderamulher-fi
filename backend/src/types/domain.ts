export type Persona = {
  id: string;
  name: string;
  businessType: string;
  city: string | null;
  monthlyRevenueAvg: string;
  stage: number;
  walletPubkey: string | null;
  /** Raw 14-digit CNPJ. When present, the on-chain Score PDA is keyed by HMAC of these digits. */
  cnpjDigits: string | null;
};

export type AuthMode = "mock" | "web3auth";
