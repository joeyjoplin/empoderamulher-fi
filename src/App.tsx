import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiClientProvider, useDefaultApiClient } from "@/api/ApiClientProvider";
import { PersonaProvider, usePersona } from "@/context/PersonaContext";
import { ImpactProvider } from "@/context/ImpactContext";
import type { ReactNode } from "react";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import InsightDetail from "./pages/InsightDetail.tsx";
import CreditConfirm from "./pages/CreditConfirm.tsx";
import CreditSuccess from "./pages/CreditSuccess.tsx";
import ScorePage from "./pages/ScorePage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import MarketplacePage from "./pages/MarketplacePage.tsx";
import ContratarPage from "./pages/ContratarPage.tsx";
import ContratarSucessoPage from "./pages/ContratarSucessoPage.tsx";
import CobrarPage from "./pages/CobrarPage.tsx";
import HistoricoPage from "./pages/HistoricoPage.tsx";
import ImpactoPage from "./pages/ImpactoPage.tsx";
import ApiSandboxPage from "./pages/ApiSandboxPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ApiClientFromPersona({ children }: { children: ReactNode }) {
  const { current } = usePersona();
  const client = useDefaultApiClient(current.id);
  return <ApiClientProvider value={client}>{children}</ApiClientProvider>;
}

/**
 * Wraps the consumer-facing routes in the persona-keyed API client +
 * ImpactProvider. Sibling routes (e.g. `/api-sandbox`) sit outside this
 * shell so partner-lender pages don't depend on a persona session.
 */
function PersonaShell() {
  return (
    <ApiClientFromPersona>
      <ImpactProvider>
        <Outlet />
      </ImpactProvider>
    </ApiClientFromPersona>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PersonaProvider>
        <BrowserRouter>
          <Routes>
            {/* Public partner-facing surface — no persona client. */}
            <Route path="/api-sandbox" element={<ApiSandboxPage />} />

            {/* Consumer-facing app — needs PersonaShell for ApiClient + ImpactProvider. */}
            <Route element={<PersonaShell />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/insights/:id" element={<InsightDetail />} />
              <Route path="/credit/offer" element={<InsightDetail />} />
              <Route path="/credit/confirm" element={<CreditConfirm />} />
              <Route path="/credit/success" element={<CreditSuccess />} />
              <Route path="/score" element={<ScorePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/marketplace/contratar/:id" element={<ContratarPage />} />
              <Route path="/marketplace/sucesso" element={<ContratarSucessoPage />} />
              <Route path="/marketplace/cobrar" element={<CobrarPage />} />
              <Route path="/historico" element={<HistoricoPage />} />
              <Route path="/impacto" element={<ImpactoPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PersonaProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
