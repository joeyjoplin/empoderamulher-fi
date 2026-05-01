export const impactMetrics = {
  activeEntrepreneurs: 1247,
  interestSavedThisMonth: 184320,
  debtsRenegotiated: 92500,
  marketplaceTransactions: 318,
  monthOverMonth: {
    entrepreneurs: 8,
    interest: 12,
    debts: 15,
    marketplace: 22,
  },
  poolTotal: 2400000,
  yieldDistributed: 18640,
  qualifiedInvestors: 47,
  cityDistribution: [
    { city: "São Paulo", count: 287, lat: -23.55, lng: -46.63 },
    { city: "Rio de Janeiro", count: 156, lat: -22.91, lng: -43.17 },
    { city: "Salvador", count: 124, lat: -12.97, lng: -38.5 },
    { city: "Belo Horizonte", count: 98, lat: -19.92, lng: -43.94 },
    { city: "Recife", count: 87, lat: -8.05, lng: -34.88 },
    { city: "Fortaleza", count: 76, lat: -3.73, lng: -38.52 },
    { city: "Brasília", count: 65, lat: -15.79, lng: -47.88 },
  ],
  recentTransactions: [
    {
      id: "1",
      type: "loan_disbursed" as const,
      description: "Empréstimo de R$ 380 concedido para Maria Silva",
      amount: 380,
      timestamp: "Há 2 minutos",
      hash: "5xR8jK9m...3pQ7",
    },
    {
      id: "2",
      type: "marketplace_payment" as const,
      description: "Maria contratou Ana — embalagens",
      amount: 80,
      timestamp: "Há 5 minutos",
      hash: "8bX2nP4q...vL3F",
    },
    {
      id: "3",
      type: "debt_renegotiated" as const,
      description: "Dívida quitada via Serasa Limpa Nome",
      amount: 1200,
      timestamp: "Há 1 hora",
      hash: "2yT5cR9w...kN8M",
    },
    {
      id: "4",
      type: "loan_disbursed" as const,
      description: "Empréstimo de R$ 850 concedido para Carla Pereira",
      amount: 850,
      timestamp: "Há 3 horas",
      hash: "7hG1xZ4d...mP2B",
    },
    {
      id: "5",
      type: "marketplace_payment" as const,
      description: "Pagamento de R$ 150 — Marketplace",
      amount: 150,
      timestamp: "Há 4 horas",
      hash: "9kL6vM2t...wQ7S",
    },
  ],
};

export const userImpact = {
  interestSavedThisMonth: 184,
  entrepreneursHired: 1,
  miniChartData: [12, 25, 18, 38, 47],
};

// Listings fixos do marketplace
export type MarketplaceListing = {
  id: string;
  sellerName: string;
  city: string;
  initials: string;
  specialty: string;
  itemHighlight: string;
  itemPrice: number;
  verified: boolean;
  isSelf?: boolean;
};

export const marketplaceListings: MarketplaceListing[] = [
  {
    id: "ana",
    sellerName: "Ana Souza",
    city: "Salvador, BA",
    initials: "AS",
    specialty: "Embalagens artesanais",
    itemHighlight: "Kit 50 unidades",
    itemPrice: 80,
    verified: true,
  },
  {
    id: "julia",
    sellerName: "Julia Mendes",
    city: "Belo Horizonte, MG",
    initials: "JM",
    specialty: "Doces gourmet para revenda",
    itemHighlight: "Caixa 20 unidades",
    itemPrice: 150,
    verified: true,
  },
  {
    id: "maria",
    sellerName: "Maria Silva (Você)",
    city: "São Paulo, SP",
    initials: "MS",
    specialty: "Bolos sob encomenda",
    itemHighlight: "A partir de R$ 65",
    itemPrice: 65,
    verified: true,
    isSelf: true,
  },
];
