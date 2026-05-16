import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DomotiqueProvider } from "@/contexts/DomotiqueContext";
import { AppLayoutRoute } from "@/components/AppLayoutRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Login                 = lazy(() => import("./pages/Login.tsx"));
const DomotiqueDashboard    = lazy(() => import("./pages/domotique/DomotiqueDashboard.tsx"));
const DomotiqueBatiments    = lazy(() => import("./pages/domotique/DomotiqueBatiments.tsx"));
const DomotiqueCapteurs     = lazy(() => import("./pages/domotique/DomotiqueCapteurs.tsx"));
const DomotiqueControle     = lazy(() => import("./pages/domotique/DomotiqueControle.tsx"));
const DomotiqueEnergie      = lazy(() => import("./pages/domotique/DomotiqueEnergie.tsx"));
const DomotiqueRoutines     = lazy(() => import("./pages/domotique/DomotiqueRoutines.tsx"));
const DomotiqueCapteurDetail= lazy(() => import("./pages/domotique/DomotiqueCapteurDetail.tsx"));
const Index                 = lazy(() => import("./pages/Index.tsx"));
const NotFound              = lazy(() => import("./pages/NotFound.tsx"));
const Demandes              = lazy(() => import("./pages/Demandes.tsx"));
const DemandeDetail         = lazy(() => import("./pages/DemandeDetail.tsx"));
const Stock                 = lazy(() => import("./pages/Stock.tsx"));
const StockDetail           = lazy(() => import("./pages/StockDetail.tsx"));
const Mouvements            = lazy(() => import("./pages/Mouvements.tsx"));
const Transferts            = lazy(() => import("./pages/Transferts.tsx"));
const Achats                = lazy(() => import("./pages/Achats.tsx"));
const Receptions            = lazy(() => import("./pages/Receptions.tsx"));
const Projets               = lazy(() => import("./pages/Projets.tsx"));
const ProjetDetail          = lazy(() => import("./pages/ProjetDetail.tsx"));
const Articles              = lazy(() => import("./pages/Articles.tsx"));
const Equipements           = lazy(() => import("./pages/Equipements.tsx"));
const Reporting             = lazy(() => import("./pages/Reporting.tsx"));
const Parametres            = lazy(() => import("./pages/Parametres.tsx"));
const Audit                 = lazy(() => import("./pages/Audit.tsx"));
const Notifications         = lazy(() => import("./pages/Notifications.tsx"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

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
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </AuthProvider>
        </DomotiqueProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
