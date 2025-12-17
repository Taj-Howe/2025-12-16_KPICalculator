const required = ["DATABASE_URL"] as const;

const entries = required.reduce<Record<string, string>>((acc, key) => {
  const value = process.env[key];
  if (!value) {
    acc[key] = "";
  } else {
    acc[key] = value;
  }
  return acc;
}, {});

export const env = entries as {
  DATABASE_URL: string;
} & Record<string, string>;
