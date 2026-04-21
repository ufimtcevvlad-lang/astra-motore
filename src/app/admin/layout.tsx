import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Админка — GM Shop 66",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-50 overflow-auto">
      {children}
    </div>
  );
}
