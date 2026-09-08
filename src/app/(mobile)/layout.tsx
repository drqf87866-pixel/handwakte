import { AppHeader } from "@/components/shared/app-header";
import { MobileNav } from "@/components/shared/mobile-nav";
import { requireSession } from "@/lib/session";

/** Mobile-first Shell für den Monteur: schmale Spalte, Navigation unten. */
export default async function MobileLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession("/scan");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader user={session.user} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
      <MobileNav />
    </div>
  );
}
