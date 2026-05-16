import { createContext, useContext, useState, type ReactNode } from "react";

interface DomotiqueContextType {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

const DomotiqueContext = createContext<DomotiqueContextType>({
  enabled: false,
  setEnabled: () => {},
});

export function DomotiqueProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(
    () => localStorage.getItem("domotique_enabled") === "true"
  );

  const setEnabled = (v: boolean) => {
    localStorage.setItem("domotique_enabled", String(v));
    setEnabledState(v);
  };

  return (
    <DomotiqueContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </DomotiqueContext.Provider>
  );
}

export const useDomotique = () => useContext(DomotiqueContext);
