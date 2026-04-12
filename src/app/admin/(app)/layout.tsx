import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/app/lib/admin-auth";
import AdminSidebar from "@/app/admin/components/AdminSidebar";
import AdminNotificationsLoader from "@/app/admin/components/AdminNotificationsLoader";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar adminName={admin.name} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {children}
      </div>
      <AdminNotificationsLoader />
    </div>
  );
}
