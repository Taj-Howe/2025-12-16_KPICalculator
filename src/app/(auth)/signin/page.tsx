import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import GitHubSignInButton from "@/components/GitHubSignInButton";

type SignInPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

const safeCallback = (value: string | undefined) => {
  if (value && value.startsWith("/")) {
    return value;
  }
  return "/dashboard";
};

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const session = await getServerSession(authOptions);
  const sp = await searchParams;
  const callbackUrl = safeCallback(sp?.callbackUrl);

  if (session) {
    redirect(callbackUrl);
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col gap-6 p-6 text-gray-900 dark:text-gray-100">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Use GitHub to authenticate and save KPI reports to your account.
        </p>
      </div>
      <div className="rounded border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <GitHubSignInButton callbackUrl={callbackUrl} />
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
          Need to review inputs first?{" "}
          <Link href="/" className="text-blue-600 underline">
            Back to calculator
          </Link>
        </p>
      </div>
    </main>
  );
};

export default SignInPage;
