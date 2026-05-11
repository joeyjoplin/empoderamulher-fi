"""Prompts for the cash-flow-gap insight engine."""

CASH_FLOW_ALERT_USER_TEMPLATE = """A microempreendedora {first_name} ({business_type}) tem nos próximos {window_days} dias:
- obrigações somando R$ {obligations}
- recebimentos previstos somando R$ {expected_inflows}
- déficit projetado: R$ {deficit}

Escreva o corpo da mensagem (3-4 frases), em primeira pessoa, do EmpowerFI
para {first_name}, em português brasileiro. Tom: empático, validador,
concreto. Use o nome dela. Mencione o número de dias e o valor exato do
déficit. Não ofereça soluções — apenas relate o problema com clareza.

Responda APENAS o texto da mensagem. Sem cabeçalho, sem "Mensagem do
EmpowerFI:", sem linha horizontal (---), sem blockquote (>), sem
assinatura final. A primeira palavra da resposta já deve ser o nome dela.
"""
