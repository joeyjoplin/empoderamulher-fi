export type Transaction = {
  id: string;
  date: string;
  description: string;
  category: "recebimento" | "fornecedor" | "imposto" | "aluguel" | "pessoal" | "outros";
  amount: number; // positive = entrada, negative = saída
};

const today = new Date();
const d = (daysAgo: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString().slice(0, 10);
};

export const transactions: Transaction[] = [
  { id: "t1", date: d(0), description: "Pix recebido — Carla M.", category: "recebimento", amount: 85 },
  { id: "t2", date: d(1), description: "Pix recebido — Bolo aniversário", category: "recebimento", amount: 220 },
  { id: "t3", date: d(2), description: "Compra ingredientes — Atacadão", category: "fornecedor", amount: -180 },
  { id: "t4", date: d(3), description: "Pix recebido — Encomenda quinta", category: "recebimento", amount: 140 },
  { id: "t5", date: d(5), description: "Embalagens — fornecedora local", category: "fornecedor", amount: -90 },
  { id: "t6", date: d(7), description: "Pix recebido — Festa infantil", category: "recebimento", amount: 480 },
  { id: "t7", date: d(10), description: "Aluguel ponto", category: "aluguel", amount: -600 },
  { id: "t8", date: d(15), description: "DAS MEI — outubro", category: "imposto", amount: -75 },
  { id: "t9", date: d(20), description: "Pix recebido — Casamento", category: "recebimento", amount: 1200 },
  { id: "t10", date: d(25), description: "Compra ovos e farinha", category: "fornecedor", amount: -240 },
];
