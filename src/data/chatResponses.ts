export type ChatResponse = { match: RegExp; response: string };

export const initialMessage =
  "Oi Maria, em que posso te ajudar hoje? Vi que você está pensando em pegar o crédito do EmpowerFI — qualquer dúvida, é só perguntar.";

export const suggestions = [
  "Como funciona o juros?",
  "Quanto vou pagar no total?",
  "Posso adiantar o pagamento?",
  "Como está meu negócio?",
];

export const chatResponses: ChatResponse[] = [
  {
    match: /negócio|negocio|como.*estou|como.*vou/i,
    response:
      "Maria, no geral seu negócio está estável. Faturamento mensal médio nos últimos 3 meses: R$ 4.500, com pico em maio (Dia das Mães). Você está ~70% do limite anual MEI, então temos espaço.\n\nO ponto de atenção é o fluxo de caixa: você concentra recebimentos no fim do mês e tem despesas no início. Por isso o alerta de hoje. Quer que eu monte um plano de equilíbrio?",
  },
  {
    match: /total|quanto.*pagar|valor.*final/i,
    response:
      "Para o crédito de R$ 380 a 4% ao mês em 1 parcela: total a pagar é R$ 395,20. Os juros são R$ 15,20.\n\nComparado ao cheque especial, você economiza R$ 20.",
  },
  {
    match: /juros|taxa|funciona/i,
    response:
      "A taxa do EmpowerFI é 4% ao mês — bem abaixo do cheque especial (8%) e do rotativo (37%). O capital vem de Tesouro Nacional tokenizado, e parte do rendimento vai pra reduzir sua taxa. É juros simples, calculado uma única vez sobre o valor pedido.",
  },
  {
    match: /adiantar|antecipar.*pagamento|quitar/i,
    response:
      "Pode sim! Se você quitar antes, a gente recalcula proporcional aos dias usados. Sem multa, sem letra miúda. É só abrir o empréstimo no histórico e tocar em ‘Quitar agora’.",
  },
  {
    match: /score/i,
    response:
      "Seu score hoje é 620/1000. O pilar mais forte é Disciplina de Pagamento (240/300). O que mais pode subir rápido é Engajamento — começar uma transação no marketplace já adiciona pontos. Quer que eu te leve até lá?",
  },
];

export function findResponse(question: string): string {
  for (const r of chatResponses) {
    if (r.match.test(question)) return r.response;
  }
  return "Ótima pergunta. Deixa eu confirmar isso pra você e já volto. Enquanto isso, posso te ajudar com algo mais específico sobre seu crédito, score ou fluxo de caixa?";
}
