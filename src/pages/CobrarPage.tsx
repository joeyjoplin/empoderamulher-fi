import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { merchants } from "@/data/marketplace";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function CobrarPage() {
  const [merchantId, setMerchantId] = useState(merchants[0].id);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("insumos");
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const merchant = merchants.find((m) => m.id === merchantId)!;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 500);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Cobrança" showBack />
        <main className="container-mobile py-10 text-center animate-scale-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-primary">Cobrança enviada!</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Cobrança enviada para {merchant.name}. Ela vai receber a notificação e pagar quando autorizar.
          </p>
          <Link
            to="/dashboard"
            className="tap-target mt-6 inline-block w-full rounded-lg bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/95"
          >
            Voltar para o início
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Cobrar" showBack />

      <main className="container-mobile py-5">
        <h1 className="text-xl font-semibold tracking-tight text-primary">Criar cobrança</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cobre uma empreendedora da sua rede. É registrado pra reputação das duas.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="Para quem você quer cobrar?">
            <select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="tap-target w-full rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
            >
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.city}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Valor (R$)" required>
            <input
              required
              type="number"
              inputMode="decimal"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="tap-target w-full rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>

          <Field label="Categoria">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="tap-target w-full rounded-lg border border-input bg-card px-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="insumos">Insumos</option>
              <option value="embalagens">Embalagens</option>
              <option value="serviços">Serviços</option>
              <option value="parcerias">Parcerias</option>
            </select>
          </Field>

          <Field label="Descrição (opcional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: 50 caixinhas personalizadas para Dia das Mães"
              rows={3}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="tap-target w-full rounded-lg bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/95 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar cobrança"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </span>
      <div className="[&>input]:h-11 [&>select]:h-11">{children}</div>
    </label>
  );
}
