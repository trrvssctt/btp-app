-- Patch performance — index manquants pour ORDER BY et filtres fréquents
-- À exécuter une seule fois sur la base de production

-- stock_movements : ORDER BY created_at DESC (requête list sans filtre)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_mov_created
  ON stock_movements(created_at DESC);

-- stock_movements : filtre depot_id (page Mouvements + Dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_mov_depot
  ON stock_movements(depot_id);

-- requests : ORDER BY created_at DESC (toutes les listes de demandes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_created
  ON requests(created_at DESC);

-- requests : filtre requester_id (demandes d'un utilisateur)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_requester
  ON requests(requester_id);

-- audit_logs : filtre actor_id (journal par utilisateur)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_actor
  ON audit_logs(actor_id);

-- transfers : ORDER BY created_at DESC (page Transferts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_created
  ON transfers(created_at DESC);

-- notifications : ORDER BY created_at DESC (déjà LIMIT 100 mais ORDER coûteux sans index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notif_created
  ON notifications(created_at DESC);
