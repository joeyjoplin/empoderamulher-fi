export type ScoreItem = {
  status: "ok" | "warn" | "lock";
  label: string;
  detail?: string;
  current: number;
  total: number;
};

export type ScorePillar = {
  id: string;
  title: string;
  icon: string;
  current: number;
  total: number;
  weight: "alta" | "média-alta" | "média" | "baixa";
  items: ScoreItem[];
};

export const scorePillars: ScorePillar[] = [
  {
    id: "disciplina",
    title: "Disciplina de Pagamento",
    icon: "PiggyBank",
    current: 240,
    total: 300,
    weight: "alta",
    items: [
      { status: "ok", label: "Contas de utilidade em dia", current: 60, total: 60 },
      { status: "ok", label: "DAS pago no mês", current: 50, total: 50 },
      { status: "warn", label: "Cartão sem rotativo", detail: "Você usou rotativo em março.", current: 40, total: 100 },
      { status: "ok", label: "Sem cheque especial", current: 90, total: 90 },
    ],
  },
  {
    id: "organizacao",
    title: "Organização Financeira",
    icon: "FolderOpen",
    current: 180,
    total: 250,
    weight: "média-alta",
    items: [
      { status: "warn", label: "Separação PF/PJ", detail: "70% das transações classificadas.", current: 60, total: 100 },
      { status: "ok", label: "Reserva criada", current: 50, total: 50 },
      { status: "ok", label: "DAS regular", current: 40, total: 50 },
      { status: "warn", label: "NFS-e proporcional", current: 30, total: 50 },
    ],
  },
  {
    id: "fluxo",
    title: "Saúde de Fluxo de Caixa",
    icon: "TrendingUp",
    current: 140,
    total: 250,
    weight: "média",
    items: [
      { status: "warn", label: "Razão receita/despesa", current: 60, total: 100 },
      { status: "warn", label: "Volatilidade do saldo", current: 40, total: 75 },
      { status: "ok", label: "Faturamento crescente", current: 40, total: 75 },
    ],
  },
  {
    id: "engajamento",
    title: "Engajamento Produtivo",
    icon: "Handshake",
    current: 60,
    total: 200,
    weight: "baixa",
    items: [
      { status: "ok", label: "Renegociações via EmpowerFI", current: 20, total: 50 },
      { status: "lock", label: "Transações no marketplace", detail: "Comece a usar.", current: 0, total: 50 },
      { status: "ok", label: "Pagamento em dia de empréstimos", current: 40, total: 50 },
      { status: "lock", label: "Uso de organização automática", current: 0, total: 50 },
    ],
  },
];
