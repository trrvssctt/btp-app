import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { companySettingsApi } from "@/lib/api";

export interface CompanySettings {
  raison_sociale: string;
  logo_url?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone?: string | null;
  email?: string | null;
  site_web?: string | null;
  ninea?: string | null;
  registre_commerce?: string | null;
  numero_tva?: string | null;
  devise?: string | null;
}

interface CompanyContextValue {
  company: CompanySettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT: CompanySettings = {
  raison_sociale: "BTP Manager",
  devise: "FCFA",
};

const CompanyContext = createContext<CompanyContextValue>({
  company: DEFAULT,
  loading: true,
  refresh: async () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<CompanySettings | null>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await companySettingsApi.get();
      if (data) setCompany(data);
    } catch {
      // En cas d'échec on garde les valeurs par défaut (branding neutre)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Met à jour le titre de l'onglet dès que le nom change
  useEffect(() => {
    if (company?.raison_sociale) {
      document.title = company.raison_sociale;
    }
  }, [company?.raison_sociale]);

  return (
    <CompanyContext.Provider value={{ company, loading, refresh }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
