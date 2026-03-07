"use client";

import { signIn } from "next-auth/react";

const GitHubSignInButton = ({ callbackUrl }: { callbackUrl: string }) => {
  return (
    <button
      type="button"
      onClick={() => signIn("github", { callbackUrl })}
      className="pill-action rounded-full px-4 py-2"
    >
      Sign in with GitHub
    </button>
  );
};

export default GitHubSignInButton;
