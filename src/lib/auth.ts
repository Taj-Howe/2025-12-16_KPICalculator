import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { env } from "./env";

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
    }),
  ],
};
