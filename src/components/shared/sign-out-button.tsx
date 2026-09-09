"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
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
      <span className="sr-only sm:not-sr-only">Abmelden</span>
    </Button>
  );
}
