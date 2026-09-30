import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Users,
  ShieldCheck,
  Database,
  Warehouse,
  TrendingUp,
  Settings,
  ChevronRight,
  Bell,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  color: string;
  permissions: string[];
  comingSoon?: boolean;
}

const settingsSections: SettingsSection[] = [
  {
    id: "entreprise",
    title: "Informations de l'entreprise",
    description: "Raison sociale, logo, coordonnées, informations légales (NINEA, registre de commerce)",
    icon: Building2,
    route: "/parametres/entreprise",
    color: "bg-blue-500",
    permissions: ["ADMIN"],
  },
  {
    id: "utilisateurs",
    title: "Utilisateurs et rôles",
    description: "Gestion des comptes utilisateurs, attribution des rôles et permissions",
    icon: Users,
    route: "/parametres/utilisateurs",
    color: "bg-purple-500",
    permissions: ["ADMIN"],
  },
  {
    id: "depots",
    title: "Dépôts et entrepôts",
    description: "Configuration des dépôts, magasins et sites de stockage",
    icon: Warehouse,
    route: "/parametres/depots",
    color: "bg-emerald-500",
    permissions: ["ADMIN", "RESP_LOGISTIQUE"],
  },
  {
    id: "fournisseurs",
    title: "Fournisseurs",
    description: "Gestion de la base fournisseurs, contacts et conditions commerciales",
    icon: TrendingUp,
    route: "/parametres/fournisseurs",
    color: "bg-orange-500",
    permissions: ["ADMIN", "ACHETEUR"],
  },
  {
    id: "familles",
    title: "Familles d'articles",
    description: "Catégorisation des articles (maçonnerie, électricité, plomberie...)",
    icon: Database,
    route: "/parametres/familles",
    color: "bg-cyan-500",
    permissions: ["ADMIN", "MAGASINIER"],
  },
  {
    id: "workflow",
    title: "Circuit de validation",
    description: "Paramétrage du workflow d'approbation des demandes",
    icon: ShieldCheck,
    route: "/parametres/workflow",
    color: "bg-rose-500",
    permissions: ["ADMIN"],
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configuration des alertes et notifications (email, système)",
    icon: Bell,
    route: "/parametres/notifications",
    color: "bg-indigo-500",
    permissions: ["ADMIN"],
  },
];

export default function ParametresPage() {
  const { hasRole } = useAuth();

  // Filtrer les sections selon les permissions
  const visibleSections = settingsSections.filter((section) =>
    section.permissions.some((role) => hasRole(role))
  );

  return (
    <>
      <PageHeader
        breadcrumb="Administration"
        title="Paramètres"
        description="Configuration et administration de l'application"
      />

      <div className="grid gap-6">
        {/* Message d'information */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Centre de configuration
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Gérez ici tous les paramètres de votre système BTP Manager : informations de l'entreprise,
                utilisateurs, dépôts, fournisseurs et workflows.
              </p>
            </div>
          </div>
        </Card>

        {/* Grille des sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            const isAvailable = !section.comingSoon;

            return (
              <Card
                key={section.id}
                className={`group relative overflow-hidden transition-all hover:shadow-lg ${
                  isAvailable ? "cursor-pointer" : "opacity-60"
                }`}
              >
                {isAvailable ? (
                  <Link to={section.route} className="block p-6">
                    <SectionContent section={section} Icon={Icon} />
                  </Link>
                ) : (
                  <div className="p-6">
                    <SectionContent section={section} Icon={Icon} />
                    <div className="mt-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                        <Settings className="w-3 h-3" />
                        Bientôt disponible
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Section système (pour information) */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Informations système</h3>
            <p className="text-sm text-muted-foreground">Détails techniques de l'application</p>
          </div>
          <Separator className="mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Version</p>
              <p className="font-semibold">1.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Base de données</p>
              <p className="font-semibold">PostgreSQL</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Environnement</p>
              <p className="font-semibold">Production</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Dernière mise à jour</p>
              <p className="font-semibold">06/07/2026</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

// Composant pour le contenu d'une section
function SectionContent({ section, Icon }: { section: any; Icon: any }) {
  return (
    <div className="relative">
      {/* Icône en arrière-plan avec couleur */}
      <div className="absolute -top-2 -right-2 w-20 h-20 rounded-full bg-gradient-to-br from-muted/50 to-muted/20 -z-10 group-hover:scale-110 transition-transform" />
      <div
        className={`w-12 h-12 rounded-xl ${section.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
      >
        <Icon className={`w-6 h-6 ${section.color.replace("bg-", "text-")}`} />
      </div>

      {/* Contenu */}
      <h3 className="font-semibold text-base mb-2 flex items-center justify-between">
        {section.title}
        {!section.comingSoon && (
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        )}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{section.description}</p>
    </div>
  );
}
