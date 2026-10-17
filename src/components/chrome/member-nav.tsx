import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useLocale } from "@/lib/i18n";
import { isStaff, type Role } from "@/lib/types";

/**
 * Member area navigation. v2 renders it as one segmented control on a card:
 * the active tab is lit, the rest read as text until hovered.
 */
export function MemberNav({ role, current }: { role: Role | null; current: string }) {
  const { t } = useLocale();
  const links = [
    { to: "/", label: t.nav.home },
    { to: "/dashboard", label: t.nav.dashboard },
    { to: "/settings", label: t.nav.account },
    ...(isStaff(role) ? [{ to: "/admin", label: t.nav.admin }] : []),
  ] as const;
  return (
    <nav className="glass segmented">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="segment"
          // Without `exact`, TanStack treats the `/` link as active on every
          // member page (its path is a prefix of all of them) and stamps
          // `aria-current="page"` on it — which lit the Home tab everywhere.
          activeOptions={{ exact: true }}
          aria-current={current === l.to ? "page" : undefined}
        >
          {l.label}
        </Link>
      ))}
      <div className="ms-auto ps-2 text-sm [&_button]:text-muted [&_button]:no-underline hover:[&_button]:text-ink">
        <UserButton />
      </div>
    </nav>
  );
}
