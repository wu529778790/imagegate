import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import crypto from "crypto";
import { getDb, getSetting, setSetting } from "./db";

// Auto-generate NEXTAUTH_SECRET if not set — stored in SQLite so it persists across restarts
function getAuthSecret(): string {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;

  const db = getDb();
  let secret = getSetting("nextauth_secret");
  if (!secret) {
    secret = crypto.randomBytes(32).toString("hex");
    setSetting("nextauth_secret", secret);
  }
  return secret;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: getAuthSecret(),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email repo", // Request repo access for image storage
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && profile) {
        const db = getDb();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const githubProfile = profile as any;

        // Upsert user
        db.prepare(`
          INSERT INTO users (github_id, username, avatar_url, access_token)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(github_id) DO UPDATE SET
            username = excluded.username,
            avatar_url = excluded.avatar_url,
            access_token = excluded.access_token
        `).run(
          githubProfile.id,
          githubProfile.login,
          githubProfile.avatar_url || null,
          account.access_token || null
        );
      }
      return true;
    },
    async session({ session }) {
      if (session.user) {
        const db = getDb();
        // Try to find user by github_id (stored in session.user.id after signIn)
        const user = db.prepare(
          "SELECT id, github_id, username, avatar_url FROM users WHERE id = ?"
        ).get(parseInt(session.user.id || "0")) as {
          id: number;
          github_id: number;
          username: string;
          avatar_url: string;
        } | undefined;

        if (user) {
          // Extend session with custom properties
          (session.user as any).id = user.id.toString();
          (session.user as any).githubId = user.github_id;
          (session.user as any).username = user.username;
          (session.user as any).avatarUrl = user.avatar_url;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

// Helper to get current user with access token
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = getDb();
  return db.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).get(parseInt(session.user.id)) as {
    id: number;
    github_id: number;
    username: string;
    avatar_url: string;
    access_token: string;
  } | undefined;
}

// Helper to get user's GitHub access token
export async function getUserGitHubToken(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.access_token || null;
}
