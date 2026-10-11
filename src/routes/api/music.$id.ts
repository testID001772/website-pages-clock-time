import { createFileRoute } from "@tanstack/react-router";
import { isUploadedSource, parseByteRange } from "@/lib/music";
import { readTrackSource } from "@/lib/server/music";

/**
 * Audio for an uploaded track: `/api/music/<id>`.
 *
 * Uploads are stored as `data:audio/...;base64,…` in the database, so this is
 * what keeps them out of page payloads — the playlist only ever receives the
 * address, and the bytes are streamed here with a long cache header. Linked
 * tracks are not stored at all: they redirect to their own address.
 *
 * Range requests are answered properly (206) so a track can be seeked.
 */
const DATA_URL = /^data:((?:audio|video)\/[a-z0-9.+-]+);base64,([\s\S]*)$/i;

export const Route = createFileRoute("/api/music/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const track = await readTrackSource(params.id).catch(() => null);
        if (!track) return new Response("Not found", { status: 404 });

        if (!isUploadedSource(track.source)) {
          // A linked track — hand the client to its own address.
          try {
            return Response.redirect(new URL(track.source, request.url).toString(), 302);
          } catch {
            return new Response("Not found", { status: 404 });
          }
        }

        const match = DATA_URL.exec(track.source);
        if (!match) return new Response("Not found", { status: 404 });
        const [, mime, base64] = match;
        const bytes = Buffer.from(base64, "base64");
        if (bytes.byteLength === 0) return new Response("Not found", { status: 404 });

        const base = {
          "content-type": mime,
          "cache-control": "public, max-age=31536000, immutable",
          "accept-ranges": "bytes",
        };
        const range = parseByteRange(request.headers.get("range"), bytes.byteLength);
        if (!range) {
          return new Response(bytes, { status: 200, headers: base });
        }
        const body = bytes.subarray(range.start, range.end + 1);
        return new Response(body, {
          status: 206,
          headers: {
            ...base,
            "content-length": String(body.byteLength),
            "content-range": `bytes ${range.start}-${range.end}/${bytes.byteLength}`,
          },
        });
      },
    },
  },
});
