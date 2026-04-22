import {
  LayoutDashboard, FileText, Package, Truck, ShoppingCart, ClipboardCheck,
  Warehouse, HardHat, Wrench, BarChart3, Settings, Building2, ArrowLeftRight,
  ShieldCheck, Bell, LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = { title: string; url: string; icon: any; end?: boolean; badge?: number; roles?: string[] };

const operations: NavItem[] = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard, end: true },
  { title: "Demandes", url: "/demandes", icon: FileText, badge: 4 },
  { title: "Stock", url: "/stock", icon: Package, roles: ["MAGASINIER", "CONDUCTEUR", "CHEF_PROJET", "RESP_TECHNIQUE", "RESP_LOGISTIQUE"] },
  { title: "Mouvements", url: "/mouvements", icon: Truck, roles: ["MAGASINIER", "RESP_LOGISTIQUE"] },
  { title: "Transferts", url: "/transferts", icon: ArrowLeftRight, roles: ["MAGASINIER", "RESP_LOGISTIQUE"] },
];

const supply: NavItem[] = [
  { title: "Achats", url: "/achats", icon: ShoppingCart, roles: ["ACHETEUR", "RESP_LOGISTIQUE"] },
  { title: "Réceptions", url: "/receptions", icon: ClipboardCheck, roles: ["MAGASINIER", "ACHETEUR", "RESP_LOGISTIQUE"] },
];

const referentiels: NavItem[] = [
  { title: "Projets & chantiers", url: "/projets", icon: HardHat, roles: ["CHEF_PROJET", "CONDUCTEUR"] },
  { title: "Articles", url: "/articles", icon: Warehouse, roles: ["MAGASINIER", "ACHETEUR"] },
  { title: "Équipements", url: "/equipements", icon: Wrench, roles: ["CHEF_PROJET", "CONDUCTEUR", "MAGASINIER", "RESP_LOGISTIQUE"] },
];

const pilotage: NavItem[] = [
  { title: "Reporting", url: "/reporting", icon: BarChart3, roles: ["CHEF_PROJET", "CONTROLEUR", "DG", "DAF", "AUDITEUR"] },
  { title: "Notifications", url: "/notifications", icon: Bell, badge: 3 },
  { title: "Journal d'audit", url: "/audit", icon: ShieldCheck, roles: ["AUDITEUR", "CONTROLEUR"] },
  { title: "Paramètres", url: "/parametres", icon: Settings, roles: ["ADMIN"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const initials = user?.nom?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "??";
  const primaryRole = user?.roles?.[0] || "Utilisateur";

  const visible = (items: NavItem[]) => items.filter(item => !item.roles || hasRole(...item.roles));

  const renderItem = (item: NavItem) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
        <NavLink
          to={item.url}
          end={item.end}
          className="flex items-center gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-base"
          activeClassName="!bg-sidebar-primary/15 !text-sidebar-primary border-l-2 border-sidebar-primary font-medium"
        >
          <item.icon className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-sm">{item.title}</span>
              {item.badge !== undefined && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sidebar-primary text-sidebar-primary-foreground">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border h-14 px-4 flex items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md gradient-accent flex items-center justify-center shadow-glow">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sidebar-foreground tracking-tight">BTP Manager</span>
              <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Stocks & Chantiers</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 px-3">Opérations</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{visible(operations).map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visible(supply).length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 px-3">Approvisionnement</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{visible(supply).map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visible(referentiels).length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 px-3">Référentiels</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{visible(referentiels).map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 px-3">Pilotage</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{visible(pilotage).map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-foreground">{initials}</div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-xs font-medium text-sidebar-foreground truncate">{user?.nom || "Invité"}</span>
                <span className="text-[10px] text-sidebar-foreground/50 truncate">{primaryRole}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md px-2 py-1.5 transition-base"
            >
              <LogOut className="w-3.5 h-3.5" /> Se déconnecter
            </button>
          </>
        ) : (
          <button onClick={logout} className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-foreground mx-auto" title="Se déconnecter">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
