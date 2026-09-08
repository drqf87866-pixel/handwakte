import { AppHeader } from "@/components/shared/app-header";
import { Sidebar } from "@/components/shared/sidebar";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession("/dashboard");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader user={session.user} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 md:flex-row md:gap-6 md:px-8 md:py-8">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
