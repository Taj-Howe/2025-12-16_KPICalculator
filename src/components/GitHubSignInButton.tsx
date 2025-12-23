"use client";

import { signIn } from "next-auth/react";

const GitHubSignInButton = ({ callbackUrl }: { callbackUrl: string }) => {
  return (
    <button
      type="button"
      onClick={() => signIn("github", { callbackUrl })}
      className="rounded border border-white/60 px-4 py-2 text-white"
    >
      Sign in with GitHub
    </button>
  );
};

export default GitHubSignInButton;
