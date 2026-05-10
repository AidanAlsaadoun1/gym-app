import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <Compass className="mx-auto size-8 text-neutral-400" />
        <h1 className="mt-3 text-lg font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          The thing you were looking for isn&apos;t here.
        </p>
        <Link href="/" className="mt-5 inline-block w-full">
          <Button className="w-full">Back home</Button>
        </Link>
      </div>
    </div>
  );
}
