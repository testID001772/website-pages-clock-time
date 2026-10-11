import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { type Profile, type Role } from "@/lib/types";
import { isAdminEmail } from "./admin-env";

type ProfileRow = {
  user_id: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  role: Role;
  email: string | null;
};

function asProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    role: row.role,
    email: row.email,
  };
}

async function loadMembers(): Promise<Profile[]> {
  const sql = await getSql();
  const rows = await sql<ProfileRow>`
    select p.user_id, p.display_name, p.bio, p.avatar_url, p.role, u.email
    from profiles p
    left join "user" u on u.id = p.user_id
    order by
      case p.role when 'owner' then 0 when 'admin' then 1 else 2 end,
      p.created_at asc
  `;
  return rows.map(asProfile);
}

async function ensureProfile(userId: string): Promise<Profile> {
  const sql = await getSql();
  const existing = await sql<ProfileRow>`
    select p.user_id, p.display_name, p.bio, p.avatar_url, p.role, u.email
    from profiles p
    left join "user" u on u.id = p.user_id
    where p.user_id = ${userId}
  `;
  if (existing[0]) {
    // Env wins: a listed address self-heals back to owner even if it
    // registered late or was demoted in the UI.
    if (existing[0].role !== "owner" && isAdminEmail(existing[0].email)) {
      await sql`update profiles set role = 'owner', updated_at = now() where user_id = ${userId}`;
      return { ...asProfile(existing[0]), role: "owner" };
    }
    return asProfile(existing[0]);
  }

  const authRows = await sql<{ name: string; email: string; image: string | null; username: string | null }>`
    select name, email, image, username from "user" where id = ${userId}
  `;
  const auth = authRows[0];
  const owners = await sql<{ n: number }>`select count(*)::int as n from profiles where role = 'owner'`;
  const role: Role = (owners[0]?.n ?? 0) === 0 || isAdminEmail(auth?.email) ? "owner" : "member";
  const displayName = auth?.name?.trim() || auth?.username || auth?.email?.split("@")[0] || "Member";
  const avatar = auth?.image ?? null;

  await sql`
    insert into profiles (user_id, display_name, bio, avatar_url, role)
    values (${userId}, ${displayName}, ${""}, ${avatar}, ${role})
    on conflict (user_id) do nothing
  `;

  const created = await sql<ProfileRow>`
    select p.user_id, p.display_name, p.bio, p.avatar_url, p.role, u.email
    from profiles p
    left join "user" u on u.id = p.user_id
    where p.user_id = ${userId}
  `;
  if (!created[0]) {
    return {
      userId,
      displayName,
      bio: "",
      avatarUrl: avatar,
      role,
      email: auth?.email ?? null,
    };
  }
  return asProfile(created[0]);
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => ensureProfile(context.userId));

const profileUpdate = z.object({
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().max(280),
  avatarUrl: z.string().nullable(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => profileUpdate.parse(input))
  .handler(async ({ context, data }) => {
    if (data.avatarUrl && data.avatarUrl.length > 700_000) {
      throw new Error("IMAGE_TOO_LARGE");
    }
    await ensureProfile(context.userId);
    const sql = await getSql();
    await sql`
      update profiles
      set display_name = ${data.displayName},
          bio = ${data.bio},
          avatar_url = ${data.avatarUrl},
          updated_at = now()
      where user_id = ${context.userId}
    `;
    return ensureProfile(context.userId);
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await ensureProfile(context.userId);
    if (me.role !== "admin" && me.role !== "owner") {
      throw new Error("ADMIN_REQUIRED");
    }
    return loadMembers();
  });

const roleUpdate = z.object({
  userId: z.string().min(1),
  role: z.enum(["member", "admin", "owner"]),
});

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => roleUpdate.parse(input))
  .handler(async ({ context, data }) => {
    const me = await ensureProfile(context.userId);
    if (me.role !== "owner") throw new Error("OWNER_ONLY");
    if (data.userId === context.userId && data.role !== "owner") {
      throw new Error("NO_SELF_DEMOTE");
    }
    const sql = await getSql();
    const target = await sql<{ role: Role }>`select role from profiles where user_id = ${data.userId}`;
    if (!target[0]) throw new Error("MEMBER_NOT_FOUND");
    if (target[0].role === "owner" && data.role !== "owner") {
      const owners = await sql<{ n: number }>`select count(*)::int as n from profiles where role = 'owner'`;
      if ((owners[0]?.n ?? 0) <= 1) throw new Error("KEEP_OWNER");
    }
    await sql`
      update profiles set role = ${data.role}, updated_at = now()
      where user_id = ${data.userId}
    `;
    return loadMembers();
  });
