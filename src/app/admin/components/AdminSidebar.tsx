"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Дашборд", icon: "📊" },
  { href: "/admin/products", label: "Товары", icon: "📦" },
  { href: "/admin/categories", label: "Категории", icon: "🗂" },
  { href: "/admin/orders", label: "Заказы", icon: "🛒" },
  { href: "/admin/conversations", label: "Чат и заявки", icon: "💬" },
  { href: "/admin/customers", label: "Клиенты", icon: "👤" },
  { href: "/admin/content", label: "Контент", icon: "📝" },
  { href: "/admin/analytics", label: "Аналитика", icon: "📈" },
];

const BOTTOM_ITEMS = [
  { href: "/admin/settings", label: "Настройки", icon: "⚙️" },
];

interface AdminSidebarProps {
  adminName: string;
}

export default function AdminSidebar({ adminName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className="flex flex-col w-60 min-h-screen shrink-0"
      style={{ background: "#1e1e2e" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <span className="text-white font-bold text-base tracking-wide">Astra Motors</span>
        <span className="ml-2 text-xs text-indigo-400 font-medium uppercase">Admin</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-400 pl-[10px]"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Separator */}
        <div className="mx-4 my-3 border-t border-white/10" />

        <ul className="space-y-0.5 px-2">
          {BOTTOM_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-400 pl-[10px]"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Admin info + logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-xs text-gray-400 mb-2 truncate" title={adminName}>
          {adminName}
        </p>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-red-400 hover:text-red-300 transition-colors py-1"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
