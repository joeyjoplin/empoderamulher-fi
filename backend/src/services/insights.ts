import { z } from "zod";

export type AnticipationSuggestion = {
  type: "anticipation";
  estimatedCost: number;
  availableAmount: number;
};

export type SupplierRenegotiationSuggestion = {
  type: "supplier_renegotiation";
  supplierName: string;
  feasibility: "low" | "medium" | "high";
};

export type EmpowerfiCreditSuggestion = {
  type: "empowerfi_credit";
  amount: number;
  monthlyRate: number;
  vsOverdraftSavings: number;
};

export type ProactiveAlertSuggestion =
  | AnticipationSuggestion
  | SupplierRenegotiationSuggestion
  | EmpowerfiCreditSuggestion;

export type ProactiveAlert = {
  alert: boolean;
  deficitAmount: number;
  deficitWindowDays: number;
  naturalLanguageAlert: string;
  suggestions: ProactiveAlertSuggestion[];
};

export type GetProactiveAlertParams = {
  personaId: string;
  lookaheadDays: number;
};

export interface InsightsService {
  getProactiveAlert(params: GetProactiveAlertParams): Promise<ProactiveAlert>;
}

export class InsightsServiceError extends Error {
  override readonly name = "InsightsServiceError";
  readonly code: "ai_service_unavailable" | "ai_service_error";
  readonly status: number;

  constructor(
    code: "ai_service_unavailable" | "ai_service_error",
    message: string,
    status = 502,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const decimalLike = z.union([z.string(), z.number()]).transform((v) => Number(v));

const aiSuggestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("anticipation"),
    estimated_cost: decimalLike,
    available_amount: decimalLike,
  }),
  z.object({
    type: z.literal("supplier_renegotiation"),
    supplier_name: z.string(),
    feasibility: z.enum(["low", "medium", "high"]),
  }),
  z.object({
    type: z.literal("empowerfi_credit"),
    amount: decimalLike,
    monthly_rate: z.number(),
    vs_overdraft_savings: decimalLike,
  }),
]);

const aiResponseSchema = z.object({
  alert: z.boolean(),
  deficit_amount: decimalLike,
  deficit_window_days: z.number().int(),
  natural_language_alert: z.string(),
  suggestions: z.array(aiSuggestionSchema),
});

function mapSuggestion(
  raw: z.infer<typeof aiSuggestionSchema>,
): ProactiveAlertSuggestion {
  switch (raw.type) {
    case "anticipation":
      return {
        type: "anticipation",
        estimatedCost: raw.estimated_cost,
        availableAmount: raw.available_amount,
      };
    case "supplier_renegotiation":
      return {
        type: "supplier_renegotiation",
        supplierName: raw.supplier_name,
        feasibility: raw.feasibility,
      };
    case "empowerfi_credit":
      return {
        type: "empowerfi_credit",
        amount: raw.amount,
        monthlyRate: raw.monthly_rate,
        vsOverdraftSavings: raw.vs_overdraft_savings,
      };
  }
}

export type HttpInsightsServiceOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

export class HttpInsightsService implements InsightsService {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HttpInsightsServiceOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
  }

  async getProactiveAlert(
    params: GetProactiveAlertParams,
  ): Promise<ProactiveAlert> {
    const url = `${this.baseUrl}/api/v1/insights/cash_flow_alert`;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          persona_id: params.personaId,
          lookahead_days: params.lookaheadDays,
        }),
      });
    } catch (err) {
      throw new InsightsServiceError(
        "ai_service_unavailable",
        err instanceof Error ? err.message : "AI service unreachable",
      );
    }

    if (!res.ok) {
      throw new InsightsServiceError(
        "ai_service_error",
        `AI service returned HTTP ${res.status}`,
      );
    }

    const json = (await res.json()) as unknown;
    const parsed = aiResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new InsightsServiceError(
        "ai_service_error",
        "AI service response failed schema validation",
      );
    }
    return {
      alert: parsed.data.alert,
      deficitAmount: parsed.data.deficit_amount,
      deficitWindowDays: parsed.data.deficit_window_days,
      naturalLanguageAlert: parsed.data.natural_language_alert,
      suggestions: parsed.data.suggestions.map(mapSuggestion),
    };
  }
}
