import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { GatePage } from "@/components/chrome/gate-page";
import { authClient } from "@/lib/auth/client";
import { compressImage } from "@/lib/image";
import { useLocale } from "@/lib/i18n";
import { getMyProfile, updateMyProfile } from "@/lib/server/profiles";
import { serverErrorText, type Profile } from "@/lib/types";

export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  const { t } = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<string | null>(null);

  useEffect(() => {
    void getMyProfile()
      .then((p) => {
        setProfile(p);
        setDisplayName(p.displayName);
        setBio(p.bio);
        setAvatarUrl(p.avatarUrl);
      })
      .catch(() => setError(t.settings.loadError));
  }, [t]);

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const url = await compressImage(file, { maxEdge: 320, maxBytes: 420_000, quality: 0.84 });
      setAvatarUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.settings.imageError);
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const next = await updateMyProfile({
        data: { displayName: displayName.trim(), bio: bio.trim(), avatarUrl },
      });
      setProfile(next);
      setStatus(t.settings.saved);
    } catch (err) {
      setError(
        err instanceof Error ? (serverErrorText(err.message, t) ?? t.settings.saveError) : t.settings.saveError,
      );
    } finally {
      setBusy(false);
    }
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setPwStatus(null);
    if (newPassword !== confirm) {
      setPwStatus(t.settings.passwordsNoMatch);
      return;
    }
    if (newPassword.length < 8) {
      setPwStatus(t.settings.tooShort);
      return;
    }
    const { error: err } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });
    if (err) {
      setPwStatus(err.message || t.settings.updateError);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setPwStatus(t.settings.updated);
  }

  return (
    <GatePage current="/settings" role={profile?.role ?? null}>
      <section className="glass rounded-[32px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight">{t.settings.title}</h1>
        <p className="mt-2 text-sm text-muted">{t.settings.subtitle}</p>

        <form className="mt-8 space-y-5" onSubmit={(e) => void onSave(e)}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="size-20 overflow-hidden rounded-full bg-white/10">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-xl">
                  {(displayName || "M").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label className="btn btn-ghost cursor-pointer">
              {t.settings.uploadPhoto}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => void onAvatar(e.target.files?.[0])}
              />
            </label>
            {avatarUrl ? (
              <button type="button" className="btn btn-ghost" onClick={() => setAvatarUrl(null)}>
                {t.settings.remove}
              </button>
            ) : null}
          </div>

          <label className="field">
            <span>{t.settings.displayName}</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} required />
          </label>
          <label className="field">
            <span>{t.settings.bio}</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              placeholder={t.settings.bioPlaceholder}
            />
          </label>
          {profile?.email ? (
            <label className="field">
              <span>{t.settings.email}</span>
              <input value={profile.email} readOnly />
            </label>
          ) : null}

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {status ? <p className="text-sm text-ice">{status}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? t.settings.saving : t.settings.saveProfile}
          </button>
        </form>
      </section>

      <section className="glass mt-4 rounded-[32px] p-6 sm:p-8">
        <h2 className="text-xl font-semibold">{t.settings.passwordTitle}</h2>
        <p className="mt-1 text-sm text-muted">
          {t.settings.passwordBlurb}
        </p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void onPassword(e)}>
          <label className="field">
            <span>{t.settings.currentPassword}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>{t.settings.newPassword}</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>{t.settings.confirmPassword}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
          {pwStatus ? <p className="text-sm text-muted">{pwStatus}</p> : null}
          <button className="btn btn-primary" type="submit">
            {t.settings.updatePassword}
          </button>
        </form>
      </section>
    </GatePage>
  );
}
