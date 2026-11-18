"use client";
import { Component, useEffect, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
export function PanelError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <h2>نمایش اطلاعات انجام نشد</h2>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      {error instanceof ApiError && error.requestId && (
        <small>
          کد پیگیری: <b dir="ltr">{error.requestId}</b>
        </small>
      )}
      <button className="btn" onClick={retry}>
        تلاش مجدد
      </button>
    </div>
  );
}
export function usePanelRefresh(refresh: () => unknown) {
  useEffect(() => {
    const listener = () => {
      Promise.resolve()
        .then(refresh)
        .catch(() => {});
    };
    window.addEventListener("alamut:refresh", listener);
    return () => window.removeEventListener("alamut:refresh", listener);
  }, [refresh]);
}
export class PanelBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <PanelError
          error="نمایش این بخش با خطا روبه‌رو شد. اطلاعات ثبت‌شده در سرور حفظ می‌شود."
          retry={() => this.setState({ failed: false })}
        />
      );
    return this.props.children;
  }
}
