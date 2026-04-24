import axios, { AxiosError } from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
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
};

export const articlesApi = {
  list: (search?: string) =>
    api.get<{ data: any[] }>("/articles", { params: search ? { search } : undefined }).then((r) => r.data.data),
  create: (a: any) => api.post<{ data: any }>("/articles", a).then((r) => r.data.data),
};

export const depotsApi = {
  list: () => api.get<{ data: any[] }>("/depots").then((r) => r.data.data),
};

export const stockApi = {
  list: (params?: { depot_id?: string; article_id?: string }) =>
    api.get<{ data: any[] }>("/stock", { params }).then((r) => r.data.data),
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
  create: (body: { supplier_id: string; statut?: string; lignes: { article_id?: string; designation_libre?: string; quantite: number; prix_unitaire: number }[] }) =>
    api.post<{ data: any }>("/purchase-orders", body).then((r) => r.data.data),
};

export const receiptsApi = {
  list: (params?: { purchase_order_id?: string; depot_id?: string }) =>
    api.get<{ data: any[] }>("/receipts", { params }).then((r) => r.data.data),
  create: (body: { purchase_order_id?: string; depot_id: string; date_reception: string; conformite?: string; reserve?: string }) =>
    api.post<{ data: any }>("/receipts", body).then((r) => r.data.data),
};

export const requestsApi = {
  list: (params?: { statut?: string; project_id?: string }) =>
    api.get<{ data: any[] }>("/requests", { params }).then((r) => r.data.data),
  get: (id: string) => api.get<{ data: any }>(`/requests/${id}`).then((r) => r.data.data),
  create: (r: any) => api.post<{ data: any }>("/requests", r).then((res) => res.data.data),
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
