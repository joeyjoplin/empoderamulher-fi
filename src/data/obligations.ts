export type Obligation = {
  id: string;
  label: string;
  amount: number;
  dueInDays: number;
  type: "imposto" | "fornecedor" | "aluguel";
};

export const obligations: Obligation[] = [
  { id: "o1", label: "DAS MEI — novembro", amount: 75, dueInDays: 7, type: "imposto" },
  { id: "o2", label: "Fornecedor de embalagens", amount: 525, dueInDays: 8, type: "fornecedor" },
  { id: "o3", label: "Aluguel do ponto", amount: 600, dueInDays: 9, type: "aluguel" },
];
