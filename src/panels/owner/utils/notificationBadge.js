export const OWNER_UNREAD_EVENT = "alamut-owner-unread";
export const OWNER_NOTIFICATIONS_PATH = "/owner/notifications";

export function emitOwnerUnread(count) {
  const unread = Math.max(0, Number(count) || 0);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OWNER_UNREAD_EVENT, { detail: unread }));
  }
}

export function countUnread(items) {
  return (Array.isArray(items) ? items : []).filter((item) => !item.is_read).length;
}
