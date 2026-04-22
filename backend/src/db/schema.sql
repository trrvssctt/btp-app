-- Schéma initial PostgreSQL — BTP stocks & approvisionnements
-- PostgreSQL 14+

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Identité ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  libelle     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  libelle     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  nom           TEXT NOT NULL,
  actif         BOOLEAN NOT NULL DEFAULT true,
  password_hash TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_scope (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  UUID,
  site_id     UUID,
  depot_id    UUID
);

-- Projets & chantiers -----------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  nom              TEXT NOT NULL,
  client           TEXT,
  budget_initial   NUMERIC(18,2) NOT NULL DEFAULT 0,
  budget_consomme  NUMERIC(18,2) NOT NULL DEFAULT 0,
  statut           TEXT NOT NULL DEFAULT 'ACTIF',
  date_debut       DATE,
  date_fin         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,
  nom          TEXT NOT NULL,
  localisation TEXT,
  responsable  TEXT,
  statut       TEXT NOT NULL DEFAULT 'ACTIF',
  UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS phases (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  ordre   INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budget_lots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  libelle       TEXT NOT NULL,
  montant_prevu NUMERIC(18,2) NOT NULL DEFAULT 0,
  UNIQUE (project_id, code)
);

-- Référentiel stock -------------------------------------------------------
CREATE TABLE IF NOT EXISTS depots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,
  nom          TEXT NOT NULL,
  type_depot   TEXT NOT NULL,
  localisation TEXT,
  site_id      UUID REFERENCES sites(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS article_families (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code    TEXT NOT NULL UNIQUE,
  libelle TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code    TEXT NOT NULL UNIQUE,
  libelle TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  designation TEXT NOT NULL,
  famille_id  UUID REFERENCES article_families(id),
  unite_id    UUID REFERENCES units(id),
  nature      TEXT NOT NULL,
  prix_moyen  NUMERIC(18,4),
  seuil_min   NUMERIC(18,4),
  actif       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT NOT NULL UNIQUE,
  raison_sociale TEXT NOT NULL,
  actif          BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS stock_balances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id     UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  depot_id       UUID NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  qte_disponible NUMERIC(18,4) NOT NULL DEFAULT 0,
  qte_reservee   NUMERIC(18,4) NOT NULL DEFAULT 0,
  qte_transit    NUMERIC(18,4) NOT NULL DEFAULT 0,
  seuil_alerte   NUMERIC(18,4),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, depot_id)
);

-- Demandes & workflow -----------------------------------------------------
CREATE TABLE IF NOT EXISTS requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero         TEXT NOT NULL UNIQUE,
  requester_id   UUID NOT NULL REFERENCES users(id),
  project_id     UUID NOT NULL REFERENCES projects(id),
  site_id        UUID NOT NULL REFERENCES sites(id),
  phase_id       UUID REFERENCES phases(id),
  budget_lot_id  UUID REFERENCES budget_lots(id),
  statut         TEXT NOT NULL,
  urgence        TEXT NOT NULL,
  motif          TEXT,
  montant_estime NUMERIC(18,2),
  date_souhaitee DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  article_id        UUID REFERENCES articles(id),
  designation_libre TEXT,
  qte_demandee      NUMERIC(18,4) NOT NULL,
  qte_approuvee     NUMERIC(18,4)
);

CREATE TABLE IF NOT EXISTS request_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  etape       TEXT NOT NULL,
  decideur_id UUID NOT NULL REFERENCES users(id),
  decision    TEXT NOT NULL,
  commentaire TEXT,
  decided_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mouvements & transferts -------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_mouvement TEXT NOT NULL,
  article_id     UUID NOT NULL REFERENCES articles(id),
  depot_id       UUID NOT NULL REFERENCES depots(id),
  quantite       NUMERIC(18,4) NOT NULL,
  reference_doc  TEXT,
  site_id        UUID REFERENCES sites(id),
  user_id        UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero     TEXT NOT NULL UNIQUE,
  statut     TEXT NOT NULL,
  depot_from UUID NOT NULL REFERENCES depots(id),
  depot_to   UUID NOT NULL REFERENCES depots(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfer_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  article_id  UUID NOT NULL REFERENCES articles(id),
  quantite    NUMERIC(18,4) NOT NULL
);

-- Achats & réceptions -----------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero        TEXT NOT NULL UNIQUE,
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  statut        TEXT NOT NULL,
  montant_total NUMERIC(18,2),
  request_id    UUID REFERENCES requests(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  article_id          UUID REFERENCES articles(id),
  designation_libre   TEXT,
  quantite            NUMERIC(18,4) NOT NULL,
  prix_unitaire       NUMERIC(18,4) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero            TEXT NOT NULL UNIQUE,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  date_reception    DATE NOT NULL,
  depot_id          UUID NOT NULL REFERENCES depots(id),
  conformite        TEXT NOT NULL DEFAULT 'CONFORME',
  reserve           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Équipements & audit -----------------------------------------------------
CREATE TABLE IF NOT EXISTS equipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_inventaire TEXT NOT NULL UNIQUE,
  designation     TEXT,
  article_id      UUID REFERENCES articles(id),
  etat            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
  site_id      UUID REFERENCES sites(id),
  user_id      UUID REFERENCES users(id),
  date_debut   DATE NOT NULL,
  date_fin     DATE
);

-- Notifications ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'INFO',
  titre       TEXT NOT NULL,
  message     TEXT NOT NULL,
  urgence     TEXT NOT NULL DEFAULT 'INFO',
  lu          BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, lu);

CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id       UUID REFERENCES users(id),
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      UUID,
  reference      TEXT,
  detail         TEXT,
  ip             TEXT,
  payload_before JSONB,
  payload_after  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_project ON requests(project_id);
CREATE INDEX IF NOT EXISTS idx_requests_statut  ON requests(statut);
CREATE INDEX IF NOT EXISTS idx_stock_mov_article ON stock_movements(article_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created    ON audit_logs(created_at);

COMMIT;
