export type Persona = {
  id: string;
  name: string;
  firstName: string;
  age: number;
  city: string;
  business: string;
  meiMonths: number;
  monthlyRevenue: number;
  balance: number;
  score: number;
  state: string;
  weeklyChange: number;
  monthRevenue: number;
  obligationsTotal: number;
  obligationsDays: number;
  obligationsShortfall: number;
  initials: string;
  alertText?: string;
};

export const personas: Persona[] = [
  {
    id: "3149a890-d1b4-5da8-a033-4de0049901a6",
    name: "Maria Silva",
    firstName: "Maria",
    age: 38,
    city: "São Paulo, SP",
    business: "Confeiteira",
    meiMonths: 14,
    monthlyRevenue: 4500,
    balance: 1840,
    score: 620,
    state: "Dívida antiga no Serasa (R$ 1.200). Faturamento via Pix. Quebra de fluxo prevista.",
    weeklyChange: 120,
    monthRevenue: 3840,
    obligationsTotal: 1200,
    obligationsDays: 9,
    obligationsShortfall: 380,
  },
  {
    id: "24b94c87-a85c-5214-827f-695615794ed8",
    name: "Ana Souza",
    firstName: "Ana",
    age: 45,
    city: "Salvador, BA",
    business: "Marmiteira",
    meiMonths: 8,
    monthlyRevenue: 3200,
    balance: 920,
    score: 540,
    state: "Organizando finanças, separação PF/PJ inconsistente.",
    weeklyChange: 60,
    monthRevenue: 2700,
    obligationsTotal: 800,
    obligationsDays: 12,
    obligationsShortfall: 200,
  },
  {
    id: "30d75b75-6f76-5d9f-8021-9b082b45af27",
    name: "Julia Lima",
    firstName: "Julia",
    age: 32,
    city: "Belo Horizonte, MG",
    business: "Doces gourmet",
    meiMonths: 26,
    monthlyRevenue: 9800,
    balance: 4320,
    score: 780,
    state: "Avançada, considerando transição para ME.",
    weeklyChange: 480,
    monthRevenue: 8900,
    obligationsTotal: 2100,
    obligationsDays: 15,
    obligationsShortfall: 0,
  },
].map((p) => ({
  ...p,
  initials: p.name.split(" ").map((n) => n[0]).slice(0, 2).join(""),
}));

export const defaultPersonaId = "3149a890-d1b4-5da8-a033-4de0049901a6";
