import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/email";

/**
 * Auth.js v5, JWT session strategy — no database adapter, because the schema
 * (spec §3) is final for MVP and doesn't include Auth.js's accounts/sessions
 * tables. Instead: `users` is upserted by hand on sign-in (below), and the
 * Google OAuth tokens ride inside the encrypted session JWT until the
 * onboarding "link calendar" step persists them (AES-256-GCM) into
 * `calendar_integrations`. Requesting the calendar scope at sign-in means
 * auth and calendar-link are one flow (spec §2.2).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // One-year rolling session: the wall tablet must never log itself out.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 365, updateAge: 60 * 60 * 24 },
  secret: process.env.AUTH_SECRET,
  // Vercel auto-trusts its own host; any other platform (Netlify included)
  // needs this explicitly or Auth.js refuses the request as a potential
  // host-header injection ("There is a problem with the server configuration").
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile?.email) {
        const email = normalizeEmail(profile.email);
        const { data, error } = await supabaseAdmin()
          .from("users")
          .upsert(
            {
              email,
              display_name: profile.name ?? null,
              avatar_url: typeof profile.picture === "string" ? profile.picture : null,
            },
            { onConflict: "email" }
          )
          .select("id")
          .single();

        if (error || !data) {
          throw new Error(`Failed to upsert user on sign-in: ${error?.message}`);
        }

        token.userId = data.id;
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;
        token.googleExpiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});
