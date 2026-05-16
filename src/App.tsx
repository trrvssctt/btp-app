import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DomotiqueProvider } from "@/contexts/DomotiqueContext";
import { AppLayoutRoute } from "@/components/AppLayoutRoute";
import { useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login.tsx";
import DomotiqueDashboard from "./pages/domotique/DomotiqueDashboard.tsx";
import DomotiqueBatiments from "./pages/domotique/DomotiqueBatiments.tsx";
import DomotiqueCapteurs from "./pages/domotique/DomotiqueCapteurs.tsx";
import DomotiqueControle from "./pages/domotique/DomotiqueControle.tsx";
import DomotiqueEnergie from "./pages/domotique/DomotiqueEnergie.tsx";
import DomotiqueRoutines from "./pages/domotique/DomotiqueRoutines.tsx";
import DomotiqueCapteurDetail from "./pages/domotique/DomotiqueCapteurDetail.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Demandes from "./pages/Demandes.tsx";
import DemandeDetail from "./pages/DemandeDetail.tsx";
import Stock from "./pages/Stock.tsx";
import StockDetail from "./pages/StockDetail.tsx";
import Mouvements from "./pages/Mouvements.tsx";
import Transferts from "./pages/Transferts.tsx";
import Achats from "./pages/Achats.tsx";
import Receptions from "./pages/Receptions.tsx";
import Projets from "./pages/Projets.tsx";
import ProjetDetail from "./pages/ProjetDetail.tsx";
import Articles from "./pages/Articles.tsx";
import Equipements from "./pages/Equipements.tsx";
import Reporting from "./pages/Reporting.tsx";
import Parametres from "./pages/Parametres.tsx";
import Audit from "./pages/Audit.tsx";
import Notifications from "./pages/Notifications.tsx";

const queryClient = new QueryClient();

// Role guard without layout (layout is in AppLayoutRoute parent)
function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DomotiqueProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Toutes les routes authentifiées partagent un seul AppLayout persistant */}
              <Route element={<AppLayoutRoute />}>
                <Route path="/" element={<Index />} />
                <Route path="/demandes" element={<Demandes />} />
                <Route path="/demandes/:id" element={<DemandeDetail />} />
                <Route path="/stock" element={<RequireRole roles={["MAGASINIER","CONDUCTEUR","CHEF_PROJET","RESP_TECHNIQUE","RESP_LOGISTIQUE"]}><Stock /></RequireRole>} />
                <Route path="/stock/:id" element={<RequireRole roles={["MAGASINIER","CONDUCTEUR","CHEF_PROJET","RESP_TECHNIQUE","RESP_LOGISTIQUE"]}><StockDetail /></RequireRole>} />
                <Route path="/mouvements" element={<RequireRole roles={["MAGASINIER","RESP_LOGISTIQUE"]}><Mouvements /></RequireRole>} />
                <Route path="/transferts" element={<RequireRole roles={["MAGASINIER","RESP_LOGISTIQUE"]}><Transferts /></RequireRole>} />
                <Route path="/achats" element={<RequireRole roles={["ACHETEUR","RESP_LOGISTIQUE"]}><Achats /></RequireRole>} />
                <Route path="/receptions" element={<RequireRole roles={["MAGASINIER","ACHETEUR","RESP_LOGISTIQUE"]}><Receptions /></RequireRole>} />
                <Route path="/projets" element={<RequireRole roles={["CHEF_PROJET","CONDUCTEUR","DG","DAF","CONTROLEUR"]}><Projets /></RequireRole>} />
                <Route path="/projets/:id" element={<RequireRole roles={["CHEF_PROJET","CONDUCTEUR","DG","DAF","CONTROLEUR"]}><ProjetDetail /></RequireRole>} />
                <Route path="/articles" element={<RequireRole roles={["MAGASINIER","ACHETEUR"]}><Articles /></RequireRole>} />
                <Route path="/equipements" element={<RequireRole roles={["CHEF_PROJET","CONDUCTEUR","MAGASINIER","RESP_LOGISTIQUE"]}><Equipements /></RequireRole>} />
                <Route path="/reporting" element={<RequireRole roles={["CHEF_PROJET","CONTROLEUR","DG","DAF","AUDITEUR"]}><Reporting /></RequireRole>} />
                <Route path="/parametres" element={<RequireRole roles={["ADMIN"]}><Parametres /></RequireRole>} />
                <Route path="/audit" element={<RequireRole roles={["AUDITEUR","CONTROLEUR"]}><Audit /></RequireRole>} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/domotique" element={<RequireRole roles={["ADMIN"]}><DomotiqueDashboard /></RequireRole>} />
                <Route path="/domotique/batiments" element={<RequireRole roles={["ADMIN"]}><DomotiqueBatiments /></RequireRole>} />
                <Route path="/domotique/capteurs" element={<RequireRole roles={["ADMIN"]}><DomotiqueCapteurs /></RequireRole>} />
                <Route path="/domotique/controle" element={<RequireRole roles={["ADMIN"]}><DomotiqueControle /></RequireRole>} />
                <Route path="/domotique/energie" element={<RequireRole roles={["ADMIN"]}><DomotiqueEnergie /></RequireRole>} />
                <Route path="/domotique/routines" element={<RequireRole roles={["ADMIN"]}><DomotiqueRoutines /></RequireRole>} />
                <Route path="/domotique/capteurs/:id" element={<RequireRole roles={["ADMIN"]}><DomotiqueCapteurDetail /></RequireRole>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </DomotiqueProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
