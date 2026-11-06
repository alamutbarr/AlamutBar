import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getMyNotifications } from "../api/notification.api";
import { OWNER_NOTIFICATIONS_PATH, OWNER_UNREAD_EVENT, countUnread } from "./notificationBadge";

export function useOwnerUnread() {
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const viewing = location.pathname === OWNER_NOTIFICATIONS_PATH;

  useEffect(() => {
    const onEvent = (event) => setUnread(Math.max(0, Number(event.detail) || 0));
    window.addEventListener(OWNER_UNREAD_EVENT, onEvent);
    return () => window.removeEventListener(OWNER_UNREAD_EVENT, onEvent);
  }, []);

  useEffect(() => {
    if (viewing) {
      setUnread(0);
      return undefined;
    }
    let alive = true;
    getMyNotifications()
      .then((items) => {
        if (alive) setUnread(countUnread(items));
      })
      .catch(() => {
        if (alive) setUnread(0);
      });
    return () => {
      alive = false;
    };
  }, [viewing, location.pathname]);

  return viewing ? 0 : unread;
}
