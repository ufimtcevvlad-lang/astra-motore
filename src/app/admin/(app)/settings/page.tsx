"use client";

import Link from "next/link";
import AdminHeader from "@/app/admin/components/AdminHeader";

const cards = [
  {
    icon: "📞",
    title: "Контакты",
    description: "Телефон, email, адрес, мессенджеры",
    href: "/admin/settings/contacts",
  },
  {
    icon: "🏢",
    title: "Реквизиты",
    description: "Название, ИНН, ОГРН, юр. адрес",
    href: "/admin/settings/company",
  },
  {
    icon: "🔔",
    title: "Уведомления",
    description: "Telegram-бот для оповещений",
    href: "/admin/settings/notifications",
  },
  {
    icon: "🕐",
    title: "Режим работы",
    description: "График работы по дням",
    href: "/admin/settings/schedule",
  },
  {
    icon: "💬",
    title: "Быстрые ответы",
    description: "Шаблоны для чата",
    href: "/admin/settings/quick-replies",
  },
  {
    icon: "📊",
    title: "Яндекс.Метрика",
    description: "Подключение счётчика аналитики",
    href: "/admin/settings/integrations",
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col flex-1">
      <AdminHeader title="Настройки" />
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
