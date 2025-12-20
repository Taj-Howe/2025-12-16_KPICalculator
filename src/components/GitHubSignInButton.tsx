"use client";

import { signIn } from "next-auth/react";

const GitHubSignInButton = ({ callbackUrl }: { callbackUrl: string }) => {
  return (
    <button
      type="button"
      onClick={() => signIn("github", { callbackUrl })}
      className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
    >
      Sign in with GitHub
    </button>
  );
};

export default GitHubSignInButton;
