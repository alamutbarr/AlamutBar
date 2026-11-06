import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";

// اعلان‌های راننده؛ همان چیزی که در داشبورد و صفحهٔ اعلان‌ها دیده می‌شود
export function useDriverNotifications(enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/driver/notifications");
      const list = res.data?.notifications;
      setItems(Array.isArray(list) ? list : []);
    } catch {
      // در صورت قطعی شبکه، فهرست قبلی حفظ می‌شود
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const markRead = useCallback(async (id) => {
    setItems((previous) => previous.map((item) => (
      String(item.id) === String(id) ? { ...item, isRead: true } : item
    )));
    await api.patch(`/driver/notifications/${id}/read`).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((previous) => previous.map((item) => ({ ...item, isRead: true })));
    await api.patch("/driver/notifications/read-all").catch(() => {});
  }, []);

  const unread = items.filter((item) => !item.isRead).length;

  return { items, unread, loading, reload, markRead, markAllRead };
}
