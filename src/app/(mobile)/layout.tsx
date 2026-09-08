import { AppHeader } from "@/components/shared/app-header";
import { MobileNav } from "@/components/shared/mobile-nav";
import { requireSession } from "@/lib/session";

/** Mobile-first Shell fuer den Monteur: schmale Spalte, Navigation unten. */
export default async function MobileLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession("/scan");

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader user={session.user} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">{children}</main>
      <MobileNav />
    </div>
  );
}
