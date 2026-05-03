import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login.tsx";
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

const protect = (el: React.ReactNode, roles?: string[]) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={protect(<Index />)} />
            <Route path="/demandes" element={protect(<Demandes />)} />
            <Route path="/demandes/:id" element={protect(<DemandeDetail />)} />
            <Route path="/stock" element={protect(<Stock />, ["MAGASINIER", "CONDUCTEUR", "CHEF_PROJET", "RESP_TECHNIQUE", "RESP_LOGISTIQUE"])} />
            <Route path="/stock/:id" element={protect(<StockDetail />, ["MAGASINIER", "CONDUCTEUR", "CHEF_PROJET", "RESP_TECHNIQUE", "RESP_LOGISTIQUE"])} />
            <Route path="/mouvements" element={protect(<Mouvements />, ["MAGASINIER", "RESP_LOGISTIQUE"])} />
            <Route path="/transferts" element={protect(<Transferts />, ["MAGASINIER", "RESP_LOGISTIQUE"])} />
            <Route path="/achats" element={protect(<Achats />, ["ACHETEUR", "RESP_LOGISTIQUE"])} />
            <Route path="/receptions" element={protect(<Receptions />, ["MAGASINIER", "ACHETEUR", "RESP_LOGISTIQUE"])} />
            <Route path="/projets" element={protect(<Projets />, ["CHEF_PROJET", "CONDUCTEUR", "DG", "DAF", "CONTROLEUR"])} />
            <Route path="/projets/:id" element={protect(<ProjetDetail />, ["CHEF_PROJET", "CONDUCTEUR", "DG", "DAF", "CONTROLEUR"])} />
            <Route path="/articles" element={protect(<Articles />, ["MAGASINIER", "ACHETEUR"])} />
            <Route path="/equipements" element={protect(<Equipements />, ["CHEF_PROJET", "CONDUCTEUR", "MAGASINIER", "RESP_LOGISTIQUE"])} />
            <Route path="/reporting" element={protect(<Reporting />, ["CHEF_PROJET", "CONTROLEUR", "DG", "DAF", "AUDITEUR"])} />
            <Route path="/parametres" element={protect(<Parametres />, ["ADMIN"])} />
            <Route path="/audit" element={protect(<Audit />, ["AUDITEUR", "CONTROLEUR"])} />
            <Route path="/notifications" element={protect(<Notifications />)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
