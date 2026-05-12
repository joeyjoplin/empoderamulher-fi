import { useMemo, useState } from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";

import {
  buildCurlSnippet,
  lookupScore,
  type LookupResult,
  type PublicScoreData,
} from "@/api/scoreSaaS";
import { DEMO_API_KEYS, DEMO_CNPJ } from "@/data/sandbox";

function formatCnpj(digits: string): string {
  if (digits.length !== 14) return digits;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function shorten(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function copy(text: string): void {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => undefined);
  }
}

const ERROR_COPY: Record<string, { title: string; help?: string }> = {
  missing_api_key: {
    title: "Chave de API ausente.",
    help: "Use a chave demo deste sandbox.",
  },
  invalid_api_key: {
    title: "Chave de API inválida.",
    help: "Use uma das chaves demo listadas no card acima.",
  },
  invalid_cnpj: {
    title: "CNPJ inválido.",
    help: "Confira os 14 dígitos.",
  },
  score_not_attested: {
    title: "Ainda não há pontuação on-chain para este CNPJ.",
    help: "Recomendamos que a microempreendedora faça uma atestação no app EmpowerFI.",
  },
  rate_limited: {
    title: "Muitas consultas.",
    help: "Aguarde 1 minuto antes de tentar novamente.",
  },
};

export default function ApiSandboxPage() {
  const [apiKey, setApiKey] = useState<string>(DEMO_API_KEYS[0] ?? "");
  const [cnpjInput, setCnpjInput] = useState<string>(formatCnpj(DEMO_CNPJ));
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);

  const cnpjDigits = useMemo(() => cnpjInput.replace(/\D/g, ""), [cnpjInput]);
  const curl = useMemo(
    () => buildCurlSnippet({ apiKey, cnpjDigits }),
    [apiKey, cnpjDigits],
  );

  const regenerateKey = () => {
    if (DEMO_API_KEYS.length <= 1) return;
    const others = DEMO_API_KEYS.filter((k) => k !== apiKey);
    const next = others[Math.floor(Math.random() * others.length)] ?? apiKey;
    setApiKey(next);
  };

  const submit = async () => {
    if (cnpjDigits.length !== 14) {
      setResult({
        kind: "err",
        status: 422,
        code: "invalid_cnpj",
        message: "CNPJ deve ter 14 dígitos.",
      });
      return;
    }
    setLoading(true);
    setResult(null);
    const r = await lookupScore({ cnpjDigits, apiKey });
    setResult(r);
    setLoading(false);
  };

  return (
    <div className="min-h-dvh bg-background pb-12">
      <header className="border-b border-border bg-card">
        <div className="container-mobile py-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Painel do Parceiro · Banco Aurora
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-primary">Sandbox de API</h1>
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning-foreground">
              Sandbox · devnet
            </span>
          </div>
        </div>
      </header>

      <main className="container-mobile space-y-4 py-5">
        <section className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-primary">
            Score-as-a-Service
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pontuação comportamental auditável on-chain, consumível por
            qualquer parceiro de crédito.
          </p>
        </section>

        <ApiKeyCard
          apiKey={apiKey}
          canRegenerate={DEMO_API_KEYS.length > 1}
          onRegenerate={regenerateKey}
        />

        <LookupForm
          cnpjInput={cnpjInput}
          onChange={setCnpjInput}
          onSubmit={submit}
          loading={loading}
          disabled={cnpjDigits.length !== 14}
        />

        {result?.kind === "ok" ? <ScoreResultCard data={result.data} /> : null}
        {result?.kind === "err" ? (
          <ErrorCard status={result.status} code={result.code} message={result.message} />
        ) : null}

        <CurlSnippet snippet={curl} />

        <p className="px-1 pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          Capital tokenizado, score auditável publicamente. Nenhum CNPJ é
          armazenado on-chain — apenas seu HMAC.
        </p>
      </main>
    </div>
  );
}

function ApiKeyCard({
  apiKey,
  canRegenerate,
  onRegenerate,
}: {
  apiKey: string;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sua chave demo
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Esta é uma chave demo. Em produção, parceiros recebem uma chave
            dedicada após onboarding.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={apiKey}
          aria-label="Chave demo da API"
          className="tap-target flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground"
        />
        <button
          type="button"
          onClick={() => copy(apiKey)}
          className="tap-target inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar
        </button>
        {canRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="tap-target inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerar
          </button>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg bg-muted/40 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Header enviado em cada requisição
        </div>
        <div className="mt-1 break-all font-mono text-xs text-foreground">
          Authorization: Bearer {apiKey}
        </div>
      </div>
    </section>
  );
}

function LookupForm({
  cnpjInput,
  onChange,
  onSubmit,
  loading,
  disabled,
}: {
  cnpjInput: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        CNPJ a consultar
      </div>
      <input
        value={cnpjInput}
        onChange={(e) => onChange(e.target.value)}
        placeholder="00.000.000/0000-00"
        inputMode="numeric"
        aria-label="CNPJ"
        className="tap-target mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || loading}
        className="tap-target mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 disabled:opacity-50"
      >
        {loading ? "Consultando..." : "Consultar pontuação"}
      </button>
    </section>
  );
}

function ScoreResultCard({ data }: { data: PublicScoreData }) {
  const explorerUrl = `https://explorer.solana.com/address/${data.on_chain_address}?cluster=devnet`;
  return (
    <section className="rounded-xl border-2 border-primary/30 bg-card p-4 shadow-sm animate-fade-in">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Score on-chain
        </div>
        <div className="text-[10px] text-muted-foreground">
          Atualizado em {formatTimestamp(data.last_updated_at)}
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-4xl font-bold text-primary">{data.total_score}</div>
        <div className="text-sm text-muted-foreground">/ 1000</div>
      </div>

      <div className="mt-4 space-y-2">
        <PillarBar label="Disciplina" value={data.breakdown.discipline} />
        <PillarBar label="Organização" value={data.breakdown.organization} />
        <PillarBar label="Fluxo de caixa" value={data.breakdown.cash_flow} />
        <PillarBar label="Engajamento" value={data.breakdown.engagement} />
      </div>

      <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
        <div title={data.attestor}>
          Atestado por:{" "}
          <span className="font-mono text-foreground">{shorten(data.attestor)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>PDA on-chain:</span>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
          >
            {shorten(data.on_chain_address)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}

function PillarBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 250) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          <strong className="text-primary">{value}</strong>/250
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ErrorCard({
  status,
  code,
  message,
}: {
  status: number;
  code: string;
  message: string;
}) {
  const friendly = ERROR_COPY[code];
  return (
    <section
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-sm"
    >
      <div className="text-xs font-medium uppercase tracking-wide text-destructive">
        HTTP {status} · {code}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">
        {friendly?.title ?? message}
      </div>
      {friendly?.help ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {friendly.help}
        </p>
      ) : null}
    </section>
  );
}

function CurlSnippet({ snippet }: { snippet: string }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          cURL equivalente
        </div>
        <button
          type="button"
          onClick={() => copy(snippet)}
          className="tap-target inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-foreground">
        <code>{snippet}</code>
      </pre>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        O snippet reflete a chave + CNPJ atualmente carregados.
      </p>
    </section>
  );
}
