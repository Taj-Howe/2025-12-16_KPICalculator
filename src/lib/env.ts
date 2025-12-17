type Env = {
  DATABASE_URL: string;
  NEXTAUTH_SECRET: string;
  GITHUB_ID: string;
  GITHUB_SECRET: string;
};

export const env: Env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "",
  GITHUB_ID: process.env.GITHUB_ID ?? "",
  GITHUB_SECRET: process.env.GITHUB_SECRET ?? "",
};
