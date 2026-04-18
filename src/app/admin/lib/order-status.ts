export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

export const ORDER_STATUS_BADGE: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const ORDER_STATUS_BUTTON: Record<string, { active: string; inactive: string }> = {
  new: { active: "bg-amber-100 text-amber-800 border-amber-300", inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
  processing: { active: "bg-indigo-100 text-indigo-800 border-indigo-300", inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
  shipped: { active: "bg-blue-100 text-blue-800 border-blue-300", inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
  delivered: { active: "bg-green-100 text-green-800 border-green-300", inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
  cancelled: { active: "bg-red-100 text-red-800 border-red-300", inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
};

export const PAYMENT_LABELS: Record<string, string> = {
  sbp: "СБП",
  card: "Карта",
  cash: "Наличные",
};

export const ORDER_STATUS_PROGRESSION = ["new", "processing", "shipped", "delivered"];
