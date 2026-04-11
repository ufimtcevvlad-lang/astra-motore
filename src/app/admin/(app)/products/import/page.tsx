"use client";

import AdminHeader from "@/app/admin/components/AdminHeader";
import ExcelImport from "@/app/admin/components/ExcelImport";

export default function ImportPage() {
  return (
    <>
      <AdminHeader title="Импорт товаров из Excel" />
      <div className="p-6">
        <ExcelImport />
      </div>
    </>
  );
}
