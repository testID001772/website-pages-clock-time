import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useLocale } from "@/lib/i18n";
import { isStaff, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MemberNav({ role, current }: { role: Role | null; current: string }) {
  const { t } = useLocale();
  const links = [
    { to: "/", label: t.nav.home },
    { to: "/dashboard", label: t.nav.dashboard },
    { to: "/settings", label: t.nav.account },
  ] as const;
  return (
    <nav className="glass flex flex-wrap items-center gap-1 rounded-[22px] p-2">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            current === l.to ? "bg-white/12 text-ink" : "text-muted hover:text-ink",
          )}
        >
          {l.label}
        </Link>
      ))}
      {isStaff(role) ? (
        <Link
          to="/admin"
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            current === "/admin" ? "bg-white/12 text-ink" : "text-muted hover:text-ink",
          )}
        >
          {t.nav.admin}
        </Link>
      ) : null}
      <div className="ms-auto ps-2 text-sm [&_button]:text-muted [&_button]:no-underline hover:[&_button]:text-ink">
        <UserButton />
      </div>
    </nav>
  );
}
