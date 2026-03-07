"use client";

import { signIn } from "next-auth/react";

const GitHubSignInButton = ({ callbackUrl }: { callbackUrl: string }) => {
  return (
    <button
      type="button"
      onClick={() => signIn("github", { callbackUrl })}
      className="rounded-full border border-white/60 px-4 py-2 text-white transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:border-[var(--accent)] focus-visible:bg-[var(--accent)] focus-visible:text-[var(--accent-foreground)]"
    >
      Sign in with GitHub
    </button>
  );
};

export default GitHubSignInButton;
