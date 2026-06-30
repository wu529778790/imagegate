import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getDb } from "./db";

const SECRET_FILE = path.join(process.cwd(), "data", ".auth_secret");

// Auto-generate NEXTAUTH_SECRET if not set — stored in a file so it persists across restarts
// (previously stored in SQLite, but that requires async init which isn't available at module level)
function getAuthSecret(): string {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;

  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, "utf-8").trim();
  }

  const secret = crypto.randomBytes(32).toString("hex");
  const dir = path.dirname(SECRET_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SECRET_FILE, secret);
  return secret;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: getAuthSecret(),
  // trustHost is required for Docker/reverse-proxy deployments where the container
  // sees http://localhost:3000 but the external URL is https://imagegate.shenzjd.com/.
  // Without this, Auth.js infers cookie domain from the internal URL, causing the
  // pkceCodeVerifier cookie to have the wrong domain, so the browser won't send it
  // on the GitHub callback → "InvalidCheck: pkceCodeVerifier value could not be parsed".
  trustHost: true,
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
        const db = await getDb();
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
        const db = await getDb();
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

  const db = await getDb();
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
