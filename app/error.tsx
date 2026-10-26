"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  unstable_retry: retry,
}: {
  unstable_retry: () => void;
}) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
      role="alert"
    >
      <h1 className="h1">We couldn’t load your files</h1>
      <p className="max-w-md text-light-100">
        Storage may be temporarily unavailable. Your session has been kept so
        you can try again.
      </p>
      <Button onClick={retry} className="primary-btn px-8 text-white">
        Try again
      </Button>
      <Link href="/sign-in" className="text-brand underline">
        Go to sign in
      </Link>
    </main>
  );
}
