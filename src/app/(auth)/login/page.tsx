import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/components/shared/login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
