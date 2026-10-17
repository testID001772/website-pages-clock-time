import { Navigate, createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/auth-form";
import { STATIC_SITE } from "@/lib/base-url";

export const Route = createFileRoute("/register")({ component: Register });

function Register() {
  // The static GitHub Pages build has no server to sign in to (see
  // `@/lib/base-url`), so the route sends the visitor back to the countdown
  // instead of showing a form whose submit could never succeed.
  if (STATIC_SITE) return <Navigate to="/" />;
  return <AuthForm mode="register" />;
}
