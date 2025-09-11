import { compare } from "bcrypt-ts";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { createGuestUser, getUser } from "@/lib/db/queries";
import { authConfig } from "./auth.config";
import { DUMMY_PASSWORD } from "@/lib/constants";
import { upsertGoogleUser } from "@/lib/db/queries";
import type { DefaultJWT } from "next-auth/jwt";

export type UserType = "guest" | "regular";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          type: "regular" as const,
        };
      },
    }),
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);

        if (!passwordsMatch) return null;

        return { ...user, type: "regular" };
      },
    }),
    Credentials({
      id: "guest",
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: "guest" };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        // For Google OAuth, we need to look up the actual user in the database
        if (account?.provider === "google") {
          try {
            // Look up user by email to get the correct database ID
            const dbUsers = await getUser(user.email as string);
            if (dbUsers.length > 0) {
              token.id = dbUsers[0].id;
              token.type = user.type;
            } else {
              // Fallback to the provided ID if user not found
              token.id = user.id as string;
              token.type = user.type;
            }
          } catch (error) {
            console.error("Error looking up user in JWT callback:", error);
            token.id = user.id as string;
            token.type = user.type;
          }
        } else {
          token.id = user.id as string;
          token.type = user.type;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }

      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === "google") {
          // Always use Google's profile.sub as the canonical ID
          const id = (profile as any)?.sub;
          const email = user.email as string;
          const name = user.name as string | undefined;
          const picture = (user as any).image as string | undefined;

          console.log("Google signIn event:", {
            id,
            email,
            name,
            userId: user.id,
          });

          if (id && email) {
            await upsertGoogleUser({ id, email, name, picture });
          }
        }
      } catch (e) {
        console.error("signIn event error:", e);
      }
    },
  },
});
