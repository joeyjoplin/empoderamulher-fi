import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { ContrafactualCompare, LoanDetailsCollapse } from "@/components/credit/ContrafactualCompare";

export default function InsightDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const titleMap: Record<string, string> = {
    credito: "Crédito EmpowerFI: R$ 380",
    antecipar: "Antecipar recebíveis",
    renegociar: "Renegociar com fornecedor",
  };
  const title = titleMap[id ?? "credito"] ?? "Detalhe do alerta";

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader title="Insight" showBack />

      <main className="container-mobile space-y-5 py-5">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-primary">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Você precisa de R$ 380 para fechar o mês sem usar o cheque especial. Veja como cada
            opção te custa, lado a lado, antes de decidir.
          </p>
        </div>

        <ContrafactualCompare />

        <LoanDetailsCollapse />

        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => navigate("/credit/confirm")}
            className="tap-target w-full rounded-lg bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/95"
          >
            Confirmar empréstimo
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="tap-target w-full rounded-lg border border-border bg-card px-5 py-3.5 text-[15px] font-semibold text-foreground hover:bg-muted"
          >
            Quero outra opção
          </button>
        </div>
      </main>
    </div>
  );
}
