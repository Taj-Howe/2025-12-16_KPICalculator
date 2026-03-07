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
    <header className="flex flex-col gap-4 border-b border-white/8 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-3">
          <span className="text-sm font-semibold tracking-[0.16em] text-white/72 uppercase">
            Offer Engine
          </span>
          <h1 className="text-3xl font-semibold text-white">{hero}</h1>
          <p className="text-sm text-white/46">{sidekick}</p>
          <p className="max-w-xl text-sm text-white/64">{description}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {sessionEmail ? (
            <>
              <span className="text-white/64">{sessionEmail}</span>
              <button
                type="button"
                onClick={onSignOut}
                className="pill-action rounded-full px-3 py-1"
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
              className="pill-action rounded-full px-3 py-1"
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
