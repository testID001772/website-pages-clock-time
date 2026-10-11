import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { AuthArt } from "@/components/auth/auth-art";
import { SpaceStage } from "@/components/space/space-stage";
import { AppChrome } from "@/components/chrome/app-chrome";
import { useLocale } from "@/lib/i18n";

type Mode = "login" | "register";

type AuthErrorShape = { code?: unknown; message?: unknown; status?: unknown; statusText?: unknown };

/**
 * Turn a Better Auth client failure into something the user can act on.
 * Known codes get friendly text (reusing existing strings); anything else
 * surfaces the server's own message/code instead of swallowing it behind
 * the generic fallback, so the next screenshot of a failure names the cause.
 */
function authErrorMessage(
  err: unknown,
  t: {
    alreadyMember: string;
    loginLink: string;
    usernameInvalid: string;
    errors: { invalidCredentials: string; usernameTaken: string };
  },
  fallback: string,
): string {
  if (err && typeof err === "object") {
    const e = err as AuthErrorShape;
    const code = typeof e.code === "string" ? e.code : "";
    const message = typeof e.message === "string" && e.message.length > 0 ? e.message : "";
    if (code.includes("ALREADY_EXISTS")) return `${t.alreadyMember} ${t.loginLink}`;
    if (code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_USERNAME_OR_PASSWORD")
      return t.errors.invalidCredentials;
    if (code === "USERNAME_IS_ALREADY_TAKEN") return t.errors.usernameTaken;
    if (code === "USERNAME_TOO_SHORT" || code === "USERNAME_TOO_LONG" || code === "INVALID_USERNAME")
      return t.usernameInvalid;
    if (message && code) return code === message ? message : `${message} (${code})`;
    if (message) return message;
    if (code) return `${fallback} (${code})`;
    const status = typeof e.status === "number" ? ` [${e.status}]` : "";
    const statusText = typeof e.statusText === "string" && e.statusText ? ` ${e.statusText}` : "";
    if (status || statusText) return `${fallback}${status}${statusText}`;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useLocale();

  const title = mode === "login" ? t.auth.loginTitle : t.auth.registerTitle;
  const subtitle = mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!authEnabled) {
      setError(t.auth.signInDisabled);
      return;
    }
    if (mode === "register" && password !== confirm) {
      setError(t.auth.passwordsNoMatch);
      return;
    }
    const cleanUsername = username.trim();
    if (mode === "register" && !/^[A-Za-z0-9_]{3,30}$/.test(cleanUsername)) {
      setError(t.auth.usernameInvalid);
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || cleanUsername || email.split("@")[0] || "Member",
          username: cleanUsername,
        });
        if (err)
          throw new Error(authErrorMessage(err, { ...t.auth, errors: t.errors }, t.auth.couldNotRegister));
      } else {
        const identifier = email.trim();
        const { error: err } = identifier.includes("@")
          ? await authClient.signIn.email({ email: identifier, password })
          : await authClient.signIn.username({ username: identifier, password });
        if (err)
          throw new Error(authErrorMessage(err, { ...t.auth, errors: t.errors }, t.auth.couldNotLogIn));
      }
      window.location.assign("/dashboard");
    } catch (err) {
      console.error(`[auth] ${mode} failed:`, err);
      setError(err instanceof Error ? err.message : t.auth.somethingWrong);
      setBusy(false);
    }
  }

  return (
    <SpaceStage>
      <AppChrome hideAuth />
      <main className="mx-auto grid min-h-dvh w-full max-w-5xl items-center px-4 py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="glass hidden overflow-hidden rounded-[32px] lg:block">
          <AuthArt title={title} />
        </div>

        <section className="glass mt-6 rounded-[32px] p-6 sm:p-8 lg:mt-0">
          <p className="text-xs font-medium tracking-[0.28em] text-muted uppercase">System Space</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>

          <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
            {mode === "register" ? (
              <label className="field">
                <span>{t.auth.name}</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  placeholder={t.auth.namePlaceholder}
                />
              </label>
            ) : null}
            {mode === "register" ? (
              <label className="field">
                <span>{t.auth.username}</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
                  placeholder={t.auth.usernamePlaceholder}
                  required
                />
              </label>
            ) : null}
            <label className="field">
              <span>{mode === "login" ? t.auth.identifier : t.auth.email}</span>
              <input
                type={mode === "login" ? "text" : "email"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete={mode === "login" ? "username" : "email"}
                placeholder={mode === "login" ? t.auth.identifierPlaceholder : t.auth.emailPlaceholder}
              />
            </label>
            <label className="field">
              <span>{t.auth.password}</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={t.auth.passwordPlaceholder}
              />
            </label>
            {mode === "register" ? (
              <label className="field">
                <span>{t.auth.confirmPassword}</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder={t.auth.confirmPasswordPlaceholder}
                />
              </label>
            ) : null}

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button className="btn btn-primary w-full" type="submit" disabled={busy}>
              {busy ? t.auth.pleaseWait : title}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted">
            {mode === "login" ? (
              <>
                {t.auth.newHere}{" "}
                <Link to="/register" className="text-ink underline-offset-4 hover:underline">
                  {t.auth.registerLink}
                </Link>
              </>
            ) : (
              <>
                {t.auth.alreadyMember}{" "}
                <Link to="/login" className="text-ink underline-offset-4 hover:underline">
                  {t.auth.loginLink}
                </Link>
              </>
            )}
          </p>
        </section>
      </main>
    </SpaceStage>
  );
}
