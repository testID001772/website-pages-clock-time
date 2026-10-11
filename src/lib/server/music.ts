import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  audioSourceError,
  isUploadedSource,
  MUSIC_LIMITS,
  publicTrackUrl,
  sortTracks,
  type MusicTrack,
} from "@/lib/music";
import { requireStaffProfile } from "./profiles";

/**
 * Music server functions.
 *
 * `listTracks` is the only public one and never throws — an unreadable library
 * renders as an empty playlist rather than an error in the header. Everything
 * else is staff-only. The audio bytes themselves never travel through these
 * functions: an upload is addressed by `/api/music/<id>`.
 */

type TrackRow = {
  id: string;
  title: string;
  artist: string;
  source: string;
  seconds: number;
  sort_order: number;
};

function asTrack(row: TrackRow): MusicTrack {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist ?? "",
    url: publicTrackUrl(row.id, row.source),
    uploaded: isUploadedSource(row.source),
    seconds: Number(row.seconds) || 0,
    order: Number(row.sort_order) || 0,
  };
}

/** Every track, in playlist order. Never throws. */
export const listTracks = createServerFn({ method: "GET" }).handler(
  async (): Promise<MusicTrack[]> => {
    try {
      const sql = await getSql();
      const rows = await sql<TrackRow>`
        select id, title, artist, source, seconds, sort_order
        from music_tracks
        order by sort_order asc, id asc
        limit ${MUSIC_LIMITS.tracks}
      `;
      // The SQL already orders the playlist; re-applying the shared sort keeps
      // the client order identical even if a backend drops ORDER BY.
      return sortTracks(rows.map(asTrack));
    } catch {
      return [];
    }
  },
);

/** Reload for the staff editor — same shape as `listTracks`. */
async function loadAll(): Promise<MusicTrack[]> {
  const sql = await getSql();
  const rows = await sql<TrackRow>`
    select id, title, artist, source, seconds, sort_order
    from music_tracks
    order by sort_order asc, id asc
    limit ${MUSIC_LIMITS.tracks}
  `;
  return sortTracks(rows.map(asTrack));
}

const trackSchema = z.object({
  /** `null`/absent for a new track, the existing id when editing. */
  id: z.string().min(1).max(64).nullish(),
  title: z.string().trim().min(1).max(MUSIC_LIMITS.title),
  artist: z.string().trim().max(MUSIC_LIMITS.artist),
  /**
   * The audio: an uploaded data URL, a link, or `null` to keep whatever an
   * existing track already points at (a title/artist edit).
   */
  source: z.string().nullable(),
  seconds: z.number().int().min(0).max(MUSIC_LIMITS.seconds),
});

/**
 * Create or update a track, then return the refreshed library — saves are
 * self-contained, so the editor never has to refetch by hand.
 */
export const saveTrack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => trackSchema.parse(input))
  .handler(async ({ context, data }): Promise<MusicTrack[]> => {
    await requireStaffProfile(context.userId);
    if (data.source !== null) {
      const problem = audioSourceError(data.source);
      if (problem) throw new Error(problem);
      if (data.source.trim().length === 0) throw new Error("MUSIC_BAD_SOURCE");
    }
    const sql = await getSql();
    if (data.id) {
      const rows = await sql<{ id: string }>`
        update music_tracks set
          title = ${data.title},
          artist = ${data.artist},
          seconds = ${data.seconds},
          source = coalesce(${data.source}, source),
          updated_at = now()
        where id = ${data.id}
        returning id
      `;
      if (!rows[0]) throw new Error("MUSIC_NOT_FOUND");
    } else {
      if (data.source === null) throw new Error("MUSIC_BAD_SOURCE");
      const count = await sql<{ n: number }>`select count(*) as n from music_tracks`;
      if (Number(count[0]?.n ?? 0) >= MUSIC_LIMITS.tracks) throw new Error("MUSIC_LIMIT_REACHED");
      const next = await sql<{ next: number }>`
        select coalesce(max(sort_order), 0) + 1 as next from music_tracks
      `;
      await sql`
        insert into music_tracks (id, title, artist, source, seconds, sort_order)
        values (
          ${crypto.randomUUID()},
          ${data.title},
          ${data.artist},
          ${data.source},
          ${data.seconds},
          ${Number(next[0]?.next ?? 1)}
        )
      `;
    }
    return loadAll();
  });

const idSchema = z.object({ id: z.string().min(1).max(64) });

/** Remove a track, then return the refreshed library. */
export const deleteTrack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => idSchema.parse(input))
  .handler(async ({ context, data }): Promise<MusicTrack[]> => {
    await requireStaffProfile(context.userId);
    const sql = await getSql();
    await sql`delete from music_tracks where id = ${data.id}`;
    return loadAll();
  });

const moveSchema = z.object({ id: z.string().min(1).max(64), direction: z.enum(["up", "down"]) });

/** Swap a track with its neighbour, then return the refreshed library. */
export const moveTrack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => moveSchema.parse(input))
  .handler(async ({ context, data }): Promise<MusicTrack[]> => {
    await requireStaffProfile(context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: string; sort_order: number }>`
      select id, sort_order from music_tracks order by sort_order asc, id asc
      limit ${MUSIC_LIMITS.tracks}
    `;
    const index = rows.findIndex((row) => row.id === data.id);
    if (index === -1) throw new Error("MUSIC_NOT_FOUND");
    const swapWith = data.direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= rows.length) return loadAll();
    // Rewrite the whole order: two rows sharing a sort_order would make the
    // playlist order depend on the tie-break, which is exactly what a move
    // should not do.
    const order = rows.map((row) => row.id);
    [order[index], order[swapWith]] = [order[swapWith], order[index]];
    for (const [position, id] of order.entries()) {
      await sql`update music_tracks set sort_order = ${position + 1} where id = ${id}`;
    }
    return loadAll();
  });

/**
 * The stored source for one track — server-side only, used by the
 * `/api/music/<id>` endpoint. Returns `null` when the row is gone.
 */
export async function readTrackSource(
  id: string,
): Promise<{ source: string; title: string } | null> {
  const sql = await getSql();
  const rows = await sql<{ source: string; title: string }>`
    select source, title from music_tracks where id = ${id}
  `;
  return rows[0] ?? null;
}
