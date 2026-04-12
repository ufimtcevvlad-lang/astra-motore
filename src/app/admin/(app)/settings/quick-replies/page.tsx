import AdminHeader from "@/app/admin/components/AdminHeader";
import QuickRepliesManager from "@/app/admin/components/QuickRepliesManager";

export const metadata = { title: "Быстрые ответы" };

export default function QuickRepliesPage() {
  return (
    <div className="flex flex-col flex-1">
      <AdminHeader title="Быстрые ответы" />
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <QuickRepliesManager />
        </div>
      </div>
    </div>
  );
}
