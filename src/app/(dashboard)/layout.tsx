import { AppHeader } from "@/components/shared/app-header";
import { Sidebar } from "@/components/shared/sidebar";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession("/dashboard");

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader user={session.user} />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
