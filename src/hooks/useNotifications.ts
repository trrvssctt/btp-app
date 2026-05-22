import { useCallback, useEffect, useRef, useState } from "react";
import { notificationsApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export interface AppNotification {
  id: string;
  type: string;
  titre: string;
  message: string | null;
  urgence: string;
  lu: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

const POLL_INTERVAL_MS = 8_000;

export function useNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const seenIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const fetchAndNotify = useCallback(async () => {
    try {
      const items: AppNotification[] = await notificationsApi.list({ lu: "false" });

      items.forEach((n) => {
        if (!seenIds.current.has(n.id)) {
          seenIds.current.add(n.id);
          if (initialLoadDone.current) {
            const action =
              n.entity_type === "Demande" && n.entity_id
                ? { label: "Voir la demande →", onClick: () => navigate(`/demandes/${n.entity_id}`) }
                : undefined;

            if (n.urgence === "CRITIQUE") {
              toast.error(n.titre, { description: n.message ?? undefined, duration: Infinity, action });
            } else if (n.urgence === "HAUTE") {
              toast.warning(n.titre, { description: n.message ?? undefined, duration: Infinity, action });
            } else {
              toast.info(n.titre, { description: n.message ?? undefined, duration: 10_000, action });
            }
          }
        }
      });

      initialLoadDone.current = true;
      setNotifications(items);
    } catch {
      // Polling errors are silently ignored
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAndNotify();
    const timer = setInterval(fetchAndNotify, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchAndNotify]);

  const markRead = useCallback(async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    seenIds.current.delete(id);
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setNotifications([]);
    seenIds.current.clear();
  }, []);

  return {
    notifications,
    unreadCount: notifications.length,
    loading,
    markRead,
    markAllRead,
    refresh: fetchAndNotify,
  };
}
