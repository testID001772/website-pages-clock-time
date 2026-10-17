import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { GatePage } from "@/components/chrome/gate-page";
import { MusicEditor } from "@/components/music/music-editor";
import { useTheme } from "@/components/theme-provider";
import {
  BACKGROUND_MAX_CHARS,
  DEFAULT_BACKGROUND_URL,
  SHIPPED_BACKGROUNDS,
  isDefaultBackground,
  resolveBackgroundUrl,
  shippedBackgroundFor,
} from "@/lib/background";
import { compressImage, sampleAverageColor } from "@/lib/image";
import { appUrl } from "@/lib/base-url";
import { useLocale } from "@/lib/i18n";
import { getMyProfile, listMembers, setMemberRole } from "@/lib/server/profiles";
import { updateSiteSettings } from "@/lib/server/site";
import {
  DEFAULT_SETTINGS,
  isStaff,
  serverErrorText,
  type Profile,
  type Role,
  type SiteSettings,
} from "@/lib/types";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const { t } = useLocale();
  const { settings, applySettings } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<SiteSettings>(settings);
  const [members, setMembers] = useState<Profile[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shippedLabels: Record<string, string> = {
    "ferric-wash": t.admin.shippedFerricWash,
    "space-nebula": t.admin.shippedSpaceNebula,
  };

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    void getMyProfile()
      .then(async (p) => {
        setProfile(p);
        if (isStaff(p.role)) {
          try {
            setMembers(await listMembers());
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => setProfile(null));
  }, []);

  /** What the stage will actually paint for the current draft. */
  const preview = resolveBackgroundUrl(draft);

  function patch(next: Partial<SiteSettings>) {
    const merged = { ...draft, ...next };
    setDraft(merged);
    applySettings(merged);
  }

  async function onBackground(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      // The URL is inlined into every server-rendered page, so the budget is
      // what we are willing to ship as HTML — the stage blurs it anyway.
      const url = await compressImage(file, {
        maxEdge: 1920,
        maxBytes: BACKGROUND_MAX_CHARS,
        quality: 0.8,
      });
      let color = draft.glassColor;
      if (draft.glassAuto) color = await sampleAverageColor(url);
      patch({ backgroundUrl: url, glassColor: color });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.admin.imageError);
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const saved = await updateSiteSettings({ data: draft });
      applySettings(saved);
      setDraft(saved);
      setStatus(t.admin.saved);
    } catch (err) {
      setError(
        err instanceof Error ? (serverErrorText(err.message, t) ?? t.admin.saveError) : t.admin.saveError,
      );
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    const next = { ...DEFAULT_SETTINGS };
    setDraft(next);
    applySettings(next);
  }

  async function changeRole(userId: string, role: Role) {
    try {
      setMembers(await setMemberRole({ data: { userId, role } }));
    } catch (err) {
      setError(
        err instanceof Error ? (serverErrorText(err.message, t) ?? t.admin.roleError) : t.admin.roleError,
      );
    }
  }

  if (profile && !isStaff(profile.role)) {
    return (
      <GatePage current="/admin" role={profile.role}>
        <section className="glass panel">
          <h1 className="h2">{t.admin.deniedTitle}</h1>
          <p className="lede mt-2">{t.admin.deniedBlurb}</p>
        </section>
      </GatePage>
    );
  }

  return (
    <GatePage current="/admin" role={profile?.role ?? null}>
      <section className="glass panel">
        <h1 className="h1">{t.admin.title}</h1>
        <p className="lede mt-2">{t.admin.subtitle}</p>

        <form className="mt-8 space-y-6" onSubmit={(e) => void onSave(e)}>
          <div>
            <p className="field-label">{t.admin.background}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="btn btn-ghost cursor-pointer">
                {t.admin.uploadImage}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void onBackground(e.target.files?.[0])}
                />
              </label>
              {draft.backgroundUrl ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    // A shipped image is a choice, not an upload: "clear" puts
                    // the default artwork back; a real upload clears to nothing.
                    patch({
                      backgroundUrl: shippedBackgroundFor(draft.backgroundUrl)
                        ? DEFAULT_BACKGROUND_URL
                        : null,
                    })
                  }
                >
                  {t.admin.clear}
                </button>
              ) : null}
            </div>
            <div
              className="mt-4 flex h-32 items-center justify-center overflow-hidden rounded-[20px] bg-cover bg-center shadow-[inset_0_0_0_1px_var(--hairline)]"
              style={
                preview
                  ? {
                      backgroundImage: `url("${preview}")`,
                      filter: `blur(${draft.backgroundBlur}px)`,
                    }
                  : undefined
              }
            >
              {preview ? null : (
                <span className="px-4 text-center text-xs text-muted">{t.admin.noBackground}</span>
              )}
            </div>
            <p className="mt-5 text-xs tracking-[0.16em] text-muted uppercase">
              {t.admin.shipped}
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SHIPPED_BACKGROUNDS.map((image) => {
                const url = appUrl(image.url);
                // `null` means "the shipped default", so the first entry also
                // covers the untouched state.
                const selected =
                  draft.backgroundUrl === url ||
                  (image.url === SHIPPED_BACKGROUNDS[0].url && draft.backgroundUrl === null);
                return (
                  <li key={image.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => patch({ backgroundUrl: url })}
                      className={`block w-full overflow-hidden rounded-[16px] no-underline transition-shadow ${
                        selected
                          ? "shadow-[0_0_0_2px_var(--color-ice)]"
                          : "shadow-[0_0_0_1px_rgb(255_255_255_/_0.12)]"
                      }`}
                    >
                      <span
                        className="block h-20 bg-cover bg-center"
                        style={{ backgroundImage: `url("${url}")` }}
                      />
                      <span className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs text-ink">
                        {shippedLabels[image.id] ?? image.id}
                        {selected ? (
                          <span className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">
                            {image.url === SHIPPED_BACKGROUNDS[0].url ? t.admin.shippedDefault : ""}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.backgroundEnabled}
                onChange={(e) => patch({ backgroundEnabled: e.target.checked })}
              />
              {t.admin.showBackground}
              {isDefaultBackground(draft) ? (
                <span className="text-xs text-muted">· {t.admin.defaultImage}</span>
              ) : null}
            </label>
          </div>

          <label className="field">
            <span>{t.admin.backgroundBlur(draft.backgroundBlur)}</span>
            <input
              type="range"
              min={0}
              max={40}
              value={draft.backgroundBlur}
              onChange={(e) => patch({ backgroundBlur: Number(e.target.value) })}
            />
          </label>

          <label className="field">
            <span>{t.admin.glassBlur(draft.glassBlur)}</span>
            <input
              type="range"
              min={0}
              max={40}
              value={draft.glassBlur}
              onChange={(e) => patch({ glassBlur: Number(e.target.value) })}
            />
          </label>

          <label className="field">
            <span>{t.admin.glassFill(draft.glassOpacity)}</span>
            <input
              type="range"
              min={0}
              max={40}
              value={draft.glassOpacity}
              onChange={(e) => patch({ glassOpacity: Number(e.target.value) })}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="field">
              <span>{t.admin.glassColor}</span>
              <input
                type="color"
                value={draft.glassColor}
                onChange={(e) => patch({ glassColor: e.target.value, glassAuto: false })}
              />
            </label>
            <label className="flex h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.glassAuto}
                onChange={(e) => patch({ glassAuto: e.target.checked })}
              />
              {t.admin.colorAuto}
            </label>
          </div>

          {error ? <p className="note note-error">{error}</p> : null}
          {status ? <p className="note note-ok">{status}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? t.admin.saving : t.admin.saveAppearance}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void reset()}>
              {t.admin.reset}
            </button>
          </div>
        </form>
      </section>

      <section id="music" className="glass panel mt-5">
        <h2 className="h2">{t.music.title}</h2>
        <p className="lede mt-2">{t.music.subtitle}</p>
        <MusicEditor />
      </section>

      <section className="glass panel mt-5">
        <h2 className="h2">{t.admin.members}</h2>
        <p className="lede mt-2">{t.admin.membersBlurb}</p>
        <ul className="mt-6 space-y-2">
          {members.map((m) => (
            <li key={m.userId} className="row">
              <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-sm font-semibold">
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.displayName}</p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
              {profile?.role === "owner" ? (
                <select
                  className="min-h-11 rounded-[14px] bg-white/5 px-3 text-sm shadow-[inset_0_0_0_1px_var(--hairline)]"
                  value={m.role}
                  onChange={(e) => void changeRole(m.userId, e.target.value as Role)}
                >
                  <option value="member">{t.admin.roles.member}</option>
                  <option value="admin">{t.admin.roles.admin}</option>
                  <option value="owner">{t.admin.roles.owner}</option>
                </select>
              ) : (
                <span className="badge">{m.role}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </GatePage>
  );
}
