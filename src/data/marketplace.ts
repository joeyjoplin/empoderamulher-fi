export type Merchant = {
  id: string;
  name: string;
  city: string;
  specialty: string;
  rating: number;
  reviews: number;
  category: "insumos" | "embalagens" | "serviços" | "parcerias";
  initials: string;
  verified: boolean;
};

export const merchants: Merchant[] = [
  {
    id: "m1",
    name: "Ana Souza",
    city: "Salvador, BA",
    specialty: "Marmitas para revenda corporativa",
    rating: 4.8,
    reviews: 32,
    category: "parcerias",
    initials: "AS",
    verified: true,
  },
  {
    id: "m2",
    name: "Julia Mendes",
    city: "Belo Horizonte, MG",
    specialty: "Doces gourmet para revenda",
    rating: 4.9,
    reviews: 87,
    category: "parcerias",
    initials: "JM",
    verified: true,
  },
  {
    id: "m3",
    name: "Patrícia Lima",
    city: "Recife, PE",
    specialty: "Embalagens artesanais sob medida",
    rating: 4.7,
    reviews: 41,
    category: "embalagens",
    initials: "PL",
    verified: true,
  },
  {
    id: "m4",
    name: "Sandra Oliveira",
    city: "Curitiba, PR",
    specialty: "Design gráfico para pequenos negócios",
    rating: 4.6,
    reviews: 23,
    category: "serviços",
    initials: "SO",
    verified: true,
  },
];

export type HistoryEvent = {
  id: string;
  date: string;
  type: "emprestimo" | "renegociacao" | "marketplace" | "score";
  title: string;
  description: string;
  amount?: number;
  status?: "ativo" | "pago" | "concluido";
};

export const historyEvents: HistoryEvent[] = [
  {
    id: "h1",
    date: "Há 2 dias",
    type: "score",
    title: "Score subiu para 620",
    description: "+15 pontos por DAS pago em dia.",
  },
  {
    id: "h2",
    date: "Há 1 semana",
    type: "marketplace",
    title: "Compra de Patrícia Lima",
    description: "Embalagens artesanais — Recife, PE",
    amount: 90,
    status: "concluido",
  },
  {
    id: "h3",
    date: "Há 2 semanas",
    type: "renegociacao",
    title: "Renegociação com fornecedor",
    description: "Atacadão — divisão em 2x sem juros.",
  },
  {
    id: "h4",
    date: "Há 1 mês",
    type: "emprestimo",
    title: "Empréstimo EmpowerFI",
    description: "R$ 250 a 4% a.m. — quitado em 30 dias.",
    amount: 250,
    status: "pago",
  },
];
