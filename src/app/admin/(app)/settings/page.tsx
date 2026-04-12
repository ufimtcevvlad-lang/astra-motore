"use client";

import Link from "next/link";
import AdminHeader from "@/app/admin/components/AdminHeader";

const cards = [
  {
    icon: "\u{1F4DE}",
    title: "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B",
    description: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D, email, \u0430\u0434\u0440\u0435\u0441, \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u044B",
    href: "/admin/settings/contacts",
  },
  {
    icon: "\u{1F3E2}",
    title: "\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B",
    description: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0418\u041D\u041D, \u041E\u0413\u0420\u041D, \u044E\u0440. \u0430\u0434\u0440\u0435\u0441",
    href: "/admin/settings/company",
  },
  {
    icon: "\u{1F514}",
    title: "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F",
    description: "Telegram-\u0431\u043E\u0442, VAPID-\u043A\u043B\u044E\u0447\u0438",
    href: "/admin/settings/notifications",
  },
  {
    icon: "\u{1F550}",
    title: "\u0420\u0435\u0436\u0438\u043C \u0440\u0430\u0431\u043E\u0442\u044B",
    description: "\u0413\u0440\u0430\u0444\u0438\u043A \u0440\u0430\u0431\u043E\u0442\u044B \u043F\u043E \u0434\u043D\u044F\u043C",
    href: "/admin/settings/schedule",
  },
  {
    icon: "\u{1F4AC}",
    title: "\u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u043E\u0442\u0432\u0435\u0442\u044B",
    description: "\u0428\u0430\u0431\u043B\u043E\u043D\u044B \u0434\u043B\u044F \u0447\u0430\u0442\u0430",
    href: "/admin/settings/quick-replies",
  },
  {
    icon: "\u{1F517}",
    title: "\u0418\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438",
    description: "\u042F\u043D\u0434\u0435\u043A\u0441.\u041C\u0435\u0442\u0440\u0438\u043A\u0430, Google Analytics",
    href: "/admin/settings/integrations",
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col flex-1">
      <AdminHeader title="\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100 group"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {card.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
