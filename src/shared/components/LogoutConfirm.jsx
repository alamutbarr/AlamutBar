import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function LogoutConfirm({
  open,
  onCancel,
  onConfirm,
  title = 'خروج از حساب کاربری',
  message = 'آیا مطمئن هستید که می‌خواهید از حساب خارج شوید؟ برای استفاده دوباره باید دوباره وارد شوید.',
  confirmLabel = 'بله، خارج می‌شوم',
  cancelLabel = 'انصراف',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="logout-confirm" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
      <button type="button" className="logout-confirm__scrim" aria-label="بستن" onClick={onCancel} />
      <div className="logout-confirm__card">
        <div className="logout-confirm__head">
          <span className="logout-confirm__icon" aria-hidden="true">
            <AlertTriangle size={20} />
          </span>
          <h3 id="logout-confirm-title">{title}</h3>
        </div>
        <p className="logout-confirm__copy">{message}</p>
        <div className="logout-confirm__actions">
          <button type="button" className="logout-confirm__cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="logout-confirm__ok" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
