"use client";

const DEFAULT_COUNTER_ID = 108384071;

export const METRIKA_COUNTER_ID = (() => {
  const id = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID);
  return Number.isFinite(id) && id > 0 ? id : DEFAULT_COUNTER_ID;
})();

export const METRIKA_GOALS = {
  PHONE_CLICK: "phone_click",
  WHATSAPP_CLICK: "whatsapp_click",
  TELEGRAM_CLICK: "telegram_click",
  ADD_TO_CART: "add_to_cart",
  ORDER_SENT: "order_sent",
  VIN_REQUEST_SENT: "vin_request_sent",
  SITE_SEARCH: "site_search",
  CART_OPEN: "cart_open",
} as const;

export type MetrikaGoal = (typeof METRIKA_GOALS)[keyof typeof METRIKA_GOALS];
export type MetrikaGoalParams = Record<string, string | number | boolean | null | undefined>;

type MetrikaWindow = Window & {
  ym?: (counterId: number, method: string, goal: string, params?: MetrikaGoalParams) => void;
};

export function reachMetrikaGoal(goal: MetrikaGoal, params?: MetrikaGoalParams) {
  if (typeof window === "undefined") return;

  const ym = (window as MetrikaWindow).ym;
  if (typeof ym !== "function") return;

  ym(METRIKA_COUNTER_ID, "reachGoal", goal, params);
}
