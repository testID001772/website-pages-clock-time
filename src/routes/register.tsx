import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/auth-form";

export const Route = createFileRoute("/register")({ component: Register });

function Register() {
  return <AuthForm mode="register" />;
}
