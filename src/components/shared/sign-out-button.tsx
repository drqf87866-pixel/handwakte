"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import type { VariantProps } from "class-variance-authority";

import { signOut } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";

export function SignOutButton({
  variant = "ghost",
  size = "sm",
  className,
  labelClassName = "sr-only sm:not-sr-only",
}: VariantProps<typeof buttonVariants> & {
  className?: string;
  labelClassName?: string;
}) {
  const router = useRouter();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={async () => {
        await signOut();
        // Gecachte Bauakte-Seiten enthalten Kundendaten. Auf einem geteilten
        // Geraet duerfte der Nachfolger sie sonst offline noch lesen.
        if ("caches" in window) {
          await caches
            .keys()
            .then((namen) => Promise.all(namen.map((name) => caches.delete(name))))
            .catch(() => {});
        }
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut />
      <span className={labelClassName}>Abmelden</span>
    </Button>
  );
}
