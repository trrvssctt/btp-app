import axios, { AxiosError } from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "btp_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ error?: { message?: string; details?: unknown } }>) => {
    if (err.response?.status === 401) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.message || err.message || "Erreur réseau";
  }
  return (err as Error)?.message || "Erreur inconnue";
}

// --- Typed endpoints ---
export interface AuthUser {
  id: string;
  email: string;
  nom: string;
  actif: boolean;
  roles: string[];
  permissions: string[];
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ data: { user: AuthUser; token: string } }>("/auth/login", { email, password }).then((r) => r.data.data),
  register: (email: string, nom: string, password: string) =>
    api.post<{ data: { user: AuthUser; token: string } }>("/auth/register", { email, nom, password }).then((r) => r.data.data),
  me: () => api.get<{ data: AuthUser }>("/auth/me").then((r) => r.data.data),
};

export const projectsApi = {
  list: () => api.get<{ data: any[] }>("/projects").then((r) => r.data.data),
  get: (id: string) => api.get<{ data: any }>(`/projects/${id}`).then((r) => r.data.data),
  detail: (id: string) => api.get<{ data: any }>(`/projects/${id}/detail`).then((r) => r.data.data),
  create: (p: any) => api.post<{ data: any }>("/projects", p).then((r) => r.data.data),
  update: (id: string, p: Partial<{ code: string; nom: string; client: string; budget_initial: number; statut: string; motif_statut: string; date_debut: string; date_fin: string }>) =>
    api.put<{ data: any }>(`/projects/${id}`, p).then((r) => r.data.data),
};

export const articlesApi = {
  list: (search?: string) =>
    api.get<{ data: any[] }>("/articles", { params: search ? { search } : undefined }).then((r) => r.data.data),
  get: (id: string) => api.get<{ data: any }>(`/articles/${id}`).then((r) => r.data.data),
  create: (a: any) => api.post<{ data: any }>("/articles", a).then((r) => r.data.data),
  update: (id: string, body: { code?: string; designation?: string; famille_id?: string | null; unite_id?: string | null; nature?: string; prix_moyen?: number | null; seuil_min?: number | null; actif?: boolean }) =>
    api.put<{ data: any }>(`/articles/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/articles/${id}`),
};

export const depotsApi = {
  list: () => api.get<{ data: any[] }>("/depots").then((r) => r.data.data),
};

export const stockApi = {
  list: (params?: { depot_id?: string; article_id?: string }) =>
    api.get<{ data: any[] }>("/stock", { params }).then((r) => r.data.data),
  get: (id: string) => api.get<{ data: any }>(`/stock/${id}`).then((r) => r.data.data),
  update: (id: string, body: { qte_disponible?: number; qte_reservee?: number; seuil_alerte?: number }) =>
    api.put<{ data: any }>(`/stock/${id}`, body).then((r) => r.data.data),
};

export const stockMovementsApi = {
  list: (params?: { article_id?: string; depot_id?: string; type_mouvement?: string }) =>
    api.get<{ data: any[] }>("/stock-movements", { params }).then((r) => r.data.data),
  create: (body: { type_mouvement: string; article_id: string; depot_id: string; quantite: number; reference_doc?: string }) =>
    api.post<{ data: any }>("/stock-movements", body).then((r) => r.data.data),
};

export const suppliersApi = {
  list: () => api.get<{ data: any[] }>("/suppliers").then((r) => r.data.data),
};

export const sitesApi = {
  list: (params?: { project_id?: string }) =>
    api.get<{ data: any[] }>("/sites", { params }).then((r) => r.data.data),
  create: (body: { project_id: string; code: string; nom: string; localisation?: string; responsable?: string; statut?: string }) =>
    api.post<{ data: any }>("/sites", body).then((r) => r.data.data),
};

export const articleFamiliesApi = {
  list: () => api.get<{ data: any[] }>("/article-families").then((r) => r.data.data),
};

export const unitsApi = {
  list: () => api.get<{ data: any[] }>("/units").then((r) => r.data.data),
};

export const transfersApi = {
  list: (params?: { statut?: string; depot_from?: string; depot_to?: string }) =>
    api.get<{ data: any[] }>("/transfers", { params }).then((r) => r.data.data),
  create: (body: { depot_from: string; depot_to: string; lines: { article_id: string; quantite: number }[] }) =>
    api.post<{ data: any }>("/transfers", body).then((r) => r.data.data),
};

export const purchaseOrdersApi = {
  list: (params?: { statut?: string; supplier_id?: string }) =>
    api.get<{ data: any[] }>("/purchase-orders", { params }).then((r) => r.data.data),
  get: (id: string) => api.get<{ data: any }>(`/purchase-orders/${id}`).then((r) => r.data.data),
  create: (body: { supplier_id: string; statut?: string; lignes: { article_id?: string; designation_libre?: string; quantite: number; prix_unitaire: number }[] }) =>
    api.post<{ data: any }>("/purchase-orders", body).then((r) => r.data.data),
};

export const receiptsApi = {
  list: (params?: { purchase_order_id?: string; depot_id?: string }) =>
    api.get<{ data: any[] }>("/receipts", { params }).then((r) => r.data.data),
  create: (body: {
    purchase_order_id?: string;
    depot_id: string;
    date_reception: string;
    conformite?: string;
    reserve?: string;
    lignes?: { article_id?: string | null; designation_libre?: string | null; quantite_recue: number; purchase_order_line_id?: string }[];
  }) =>
    api.post<{ data: any }>("/receipts", body).then((r) => r.data.data),
};

export const requestsApi = {
  list: (params?: { statut?: string; project_id?: string }) =>
    api.get<{ data: any[] }>("/requests", { params }).then((r) => r.data.data),
  get: (id: string) => api.get<{ data: any }>(`/requests/${id}`).then((r) => r.data.data),
  create: (r: any) => api.post<{ data: any }>("/requests", r).then((res) => res.data.data),
  update: (id: string, body: { urgence?: string; motif?: string; date_souhaitee?: string | null; lignes?: Array<{ article_id?: string | null; designation_libre?: string | null; qte_demandee: number }> }) =>
    api.put<{ data: any }>(`/requests/${id}`, body).then((r) => r.data.data),
  cancel: (id: string) => api.delete<{ data: any }>(`/requests/${id}`).then((r) => r.data.data),
  submit: (id: string) => api.post<{ data: any }>(`/requests/${id}/submit`, {}).then((r) => r.data.data),
  approve: (id: string, body: { etape: string; decision: string; commentaire?: string }) =>
    api.post<{ data: any }>(`/requests/${id}/approvals`, body).then((r) => r.data.data),
  complement: (id: string, commentaire?: string) =>
    api.post<{ data: any }>(`/requests/${id}/complement`, { commentaire }).then((r) => r.data.data),
  resubmit: (id: string) =>
    api.post<{ data: any }>(`/requests/${id}/resubmit`, {}).then((r) => r.data.data),
};

export const equipementsApi = {
  list: (search?: string) =>
    api.get<{ data: any[] }>("/equipements", { params: search ? { search } : undefined }).then((r) => r.data.data),
  get: (id: string) => api.get<{ data: any }>(`/equipements/${id}`).then((r) => r.data.data),
  create: (body: { code_inventaire: string; designation?: string; etat?: string; article_id?: string }) =>
    api.post<{ data: any }>("/equipements", body).then((r) => r.data.data),
  update: (id: string, body: { etat?: string; designation?: string }) =>
    api.put<{ data: any }>(`/equipements/${id}`, body).then((r) => r.data.data),
  // UC-11 — Affectations
  listAssignments: (id: string) =>
    api.get<{ data: any[] }>(`/equipements/${id}/affectations`).then((r) => r.data.data),
  createAssignment: (id: string, body: {
    site_id?: string | null;
    user_id?: string | null;
    date_debut: string;
    commentaire?: string | null;
    request_id?: string | null;
  }) =>
    api.post<{ data: any }>(`/equipements/${id}/affectations`, body).then((r) => r.data.data),
  returnEquipment: (id: string, affId: string, body: {
    date_fin?: string;
    etat_retour?: "DISPONIBLE" | "EN_MAINTENANCE" | "HORS_SERVICE" | "PERDU";
    commentaire?: string | null;
  }) =>
    api.put<{ data: any }>(`/equipements/${id}/affectations/${affId}/retour`, body).then((r) => r.data.data),
};

export const usersApi = {
  list: () => api.get<{ data: any[] }>("/users").then((r) => r.data.data),
};

export const rolesApi = {
  list: () => api.get<{ data: any[] }>("/roles").then((r) => r.data.data),
};

export const notificationsApi = {
  list: (params?: { type?: string; lu?: string }) =>
    api.get<{ data: any[] }>("/notifications", { params }).then((r) => r.data.data),
  markRead: (id: string) =>
    api.put<{ data: any }>(`/notifications/${id}/read`).then((r) => r.data.data),
  markAllRead: () => api.post("/notifications/read-all"),
};

export const auditApi = {
  list: (params?: { action?: string; entity_type?: string; search?: string }) =>
    api.get<{ data: any[] }>("/audit", { params }).then((r) => r.data.data),
};

export const budgetLotsApi = {
  list: (params?: { project_id?: string }) =>
    api.get<{ data: any[] }>("/budget-lots", { params }).then((r) => r.data.data),
  create: (body: { project_id: string; code: string; libelle: string; montant_prevu: number }) =>
    api.post<{ data: any }>("/budget-lots", body).then((r) => r.data.data),
  update: (id: string, body: Partial<{ code: string; libelle: string; montant_prevu: number }>) =>
    api.put<{ data: any }>(`/budget-lots/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/budget-lots/${id}`),
};

export const reportingApi = {
  get: () =>
    api.get<{
      data: {
        projects: any[];
        requestStatuts: any[];
        topSuppliers: any[];
        mouvementsParMois: any[];
        topArticles: any[];
        budgetLots: any[];
      };
    }>("/reporting").then((r) => r.data.data),
};

// ─── Domotique API ────────────────────────────────────────────────────────────
const dom = "/domotique";

export const domBuildingApi = {
  list:             ()                   => api.get<{ data: any[] }>(`${dom}/buildings`).then(r => r.data.data),
  getTree:          (id: string)         => api.get<{ data: any }>(`${dom}/buildings/${id}/tree`).then(r => r.data.data),
  create:           (b: any)             => api.post<{ data: any }>(`${dom}/buildings`, b).then(r => r.data.data),
  update:           (id: string, b: any) => api.put<{ data: any }>(`${dom}/buildings/${id}`, b).then(r => r.data.data),
  remove:           (id: string)         => api.delete(`${dom}/buildings/${id}`),
  createFloor:      (f: any)             => api.post<{ data: any }>(`${dom}/floors`, f).then(r => r.data.data),
  updateFloor:      (id: string, f: any) => api.put<{ data: any }>(`${dom}/floors/${id}`, f).then(r => r.data.data),
  deleteFloor:      (id: string)         => api.delete(`${dom}/floors/${id}`),
  createZone:       (z: any)             => api.post<{ data: any }>(`${dom}/zones`, z).then(r => r.data.data),
  updateZone:       (id: string, z: any) => api.put<{ data: any }>(`${dom}/zones/${id}`, z).then(r => r.data.data),
  deleteZone:       (id: string)         => api.delete(`${dom}/zones/${id}`),
  createApartment:  (a: any)             => api.post<{ data: any }>(`${dom}/apartments`, a).then(r => r.data.data),
  updateApartment:  (id: string, a: any) => api.put<{ data: any }>(`${dom}/apartments/${id}`, a).then(r => r.data.data),
  deleteApartment:  (id: string)         => api.delete(`${dom}/apartments/${id}`),
  createRoom:       (r: any)             => api.post<{ data: any }>(`${dom}/rooms`, r).then(r => r.data.data),
  updateRoom:       (id: string, r: any) => api.put<{ data: any }>(`${dom}/rooms/${id}`, r).then(r => r.data.data),
  deleteRoom:       (id: string)         => api.delete(`${dom}/rooms/${id}`),
};

export const domDeviceApi = {
  list:   (params?: { building_id?: string; type?: string; category?: string; status?: string; search?: string }) =>
            api.get<{ data: any[] }>(`${dom}/devices`, { params }).then(r => r.data.data),
  get:    (id: string) => api.get<{ data: any }>(`${dom}/devices/${id}`).then(r => r.data.data),
  create: (d: any)     => api.post<{ data: any }>(`${dom}/devices`, d).then(r => r.data.data),
  update: (id: string, d: any) => api.put<{ data: any }>(`${dom}/devices/${id}`, d).then(r => r.data.data),
  sendCommand: (id: string, cmd: any) =>
    api.post<{ data: any }>(`${dom}/devices/${id}/command`, cmd).then(r => r.data.data),
};

export const domReadingApi = {
  list: (params?: { device_id?: string; limit?: number; since?: string }) =>
    api.get<{ data: any[] }>(`${dom}/readings`, { params }).then(r => r.data.data),
  ingest: (r: any) => api.post<{ data: any }>(`${dom}/readings`, r).then(r => r.data.data),
};

export const domCommandApi = {
  list: (params?: { device_id?: string; limit?: number }) =>
    api.get<{ data: any[] }>(`${dom}/commands`, { params }).then(r => r.data.data),
};

export const domAlertApi = {
  list:    (params?: { resolved?: boolean; severity?: string }) =>
    api.get<{ data: any[] }>(`${dom}/alerts`, { params }).then(r => r.data.data),
  resolve: (id: string) => api.put<{ data: any }>(`${dom}/alerts/${id}/resolve`).then(r => r.data.data),
};

export const domRuleApi = {
  list:    ()                        => api.get<{ data: any[] }>(`${dom}/rules`).then(r => r.data.data),
  create:  (r: any)                  => api.post<{ data: any }>(`${dom}/rules`, r).then(r => r.data.data),
  update:  (id: string, r: any)      => api.put<{ data: any }>(`${dom}/rules/${id}`, r).then(r => r.data.data),
  remove:  (id: string)              => api.delete(`${dom}/rules/${id}`),
  toggle:  (id: string, enabled: boolean) =>
    api.patch<{ data: any }>(`${dom}/rules/${id}/enabled`, { enabled }).then(r => r.data.data),
  trigger: (id: string)              => api.post<{ data: any }>(`${dom}/rules/${id}/trigger`).then(r => r.data.data),
};

export const domEnergyApi = {
  summary: () => api.get<{ data: any }>(`${dom}/energy`).then(r => r.data.data),
};
