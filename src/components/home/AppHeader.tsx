"use client";

import type { AppHeaderProps } from "./types";

const AppHeader = ({
  hero,
  sidekick,
  description,
  sessionEmail,
  onSignIn,
  onSignOut,
  signInCta,
}: AppHeaderProps) => {
  return (
    <header className="flex flex-col gap-4 border-b border-white/30 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-3">
          <span className="text-sm font-semibold text-white">
            KPI Calculator
          </span>
          <h1 className="text-3xl font-semibold text-white">{hero}</h1>
          <p className="text-sm text-white/60">{sidekick}</p>
          <p className="max-w-xl text-sm text-white/80">{description}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {sessionEmail ? (
            <>
              <span className="text-white/80">{sessionEmail}</span>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-full border border-white/60 px-3 py-1 text-white transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:border-[var(--accent)] focus-visible:bg-[var(--accent)] focus-visible:text-[var(--accent-foreground)]"
              >
                Sign out
              </button>
            </>
          ) : signInCta ? (
            signInCta
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-full border border-white/60 px-3 py-1 text-white transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:border-[var(--accent)] focus-visible:bg-[var(--accent)] focus-visible:text-[var(--accent-foreground)]"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
