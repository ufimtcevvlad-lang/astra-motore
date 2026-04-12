"use client";

import dynamic from "next/dynamic";

const AdminNotifications = dynamic(
  () => import("./AdminNotifications"),
  { ssr: false }
);

export default function AdminNotificationsLoader() {
  return <AdminNotifications />;
}
