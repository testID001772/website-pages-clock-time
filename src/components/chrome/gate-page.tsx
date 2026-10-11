import { type ReactNode } from "react";
import { AppChrome } from "@/components/chrome/app-chrome";
import { MemberNav } from "@/components/chrome/member-nav";
import { SpaceStage } from "@/components/space/space-stage";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { Role } from "@/lib/types";

export function GatePage({
  current,
  role,
  children,
}: {
  current: string;
  role: Role | null;
  children: ReactNode;
}) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <SpaceStage>
        <AppChrome />
        <main className="mx-auto max-w-4xl px-4 py-28">
          <div className="glass h-40 animate-pulse rounded-[32px]" />
        </main>
      </SpaceStage>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return (
    <SpaceStage>
      <AppChrome />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24">
        <MemberNav role={role} current={current} />
        <div className="mt-6">{children}</div>
      </main>
    </SpaceStage>
  );
}
