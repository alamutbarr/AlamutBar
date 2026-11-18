import { useMemo, type AnchorHTMLAttributes, type MouseEvent } from "react";
import {
  Link as RouterLink,
  useNavigate,
  useLocation,
  useSearchParams as useQuery,
} from "react-router";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  onNavigate?: () => void;
};
export default function Link({
  href,
  onNavigate,
  onClick,
  children,
  ...props
}: Props) {
  const local = href.startsWith("/") && !href.startsWith("//");
  function click(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !props.target
    )
      onNavigate?.();
  }
  return local ? (
    <RouterLink to={href} {...props} onClick={click}>
      {children}
    </RouterLink>
  ) : (
    <a href={href} {...props} onClick={click}>
      {children}
    </a>
  );
}
export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (path: string) => navigate(path),
      replace: (path: string) => navigate(path, { replace: true }),
      refresh: () => window.location.reload(),
    }),
    [navigate],
  );
}
export function useSearchParams() {
  return useQuery()[0];
}
export function usePathname() {
  return useLocation().pathname;
}
