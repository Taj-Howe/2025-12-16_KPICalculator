import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { env } from "./env";

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => {
      if (session.user) {
        session.user.email = token.email ?? session.user.email ?? null;
        session.user.name = token.name ?? session.user.name ?? null;
        session.user.image = token.picture ?? session.user.image ?? null;
      }
      return session;
    },
  },
};
