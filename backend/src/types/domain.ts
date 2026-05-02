export type Persona = {
  id: string;
  name: string;
  businessType: string;
  city: string | null;
  monthlyRevenueAvg: string;
  stage: number;
  walletPubkey: string | null;
};

export type AuthMode = "mock" | "web3auth";
