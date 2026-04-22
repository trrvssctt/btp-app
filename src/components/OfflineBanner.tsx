import { AlertCircle } from "lucide-react";

export function OfflineBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-4 rounded-lg border border-warning/30 bg-warning-soft text-warning px-3 py-2 text-xs flex items-center gap-2">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>API backend non disponible — affichage des données de démonstration. Démarrez le backend (<code className="font-mono">cd backend && npm run dev</code>) pour activer la persistance.</span>
    </div>
  );
}
