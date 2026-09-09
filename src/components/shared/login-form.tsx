"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Flame } from "lucide-react";
import { toast } from "sonner";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);

    const { error } = await signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setPending(false);

    if (error) {
      toast.error(error.message ?? "Anmeldung fehlgeschlagen");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="items-center text-center">
        <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-2xl shadow-xs">
          <Flame className="size-5" />
        </span>
        <CardTitle className="text-xl">Willkommen zurück</CardTitle>
        <CardDescription>Melden Sie sich an, um fortzufahren.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="name@betrieb.de"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" disabled={pending} className="mt-1 w-full" size="lg">
            {pending ? "Wird geprüft …" : "Anmelden"}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            <Link href="/passwort-vergessen" className="underline underline-offset-4">
              Passwort vergessen?
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
