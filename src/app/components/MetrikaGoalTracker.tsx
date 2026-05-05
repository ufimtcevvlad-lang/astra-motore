"use client";

import { useEffect } from "react";
import { METRIKA_GOALS, reachMetrikaGoal } from "../lib/metrika-goals";

function getAnchor(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLAnchorElement>("a[href]");
}

function getSearchQuery(form: HTMLFormElement) {
  const data = new FormData(form);
  const q = data.get("q");
  return typeof q === "string" ? q.trim() : "";
}

export function MetrikaGoalTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = getAnchor(event.target);
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      const hrefLower = href.toLowerCase();

      if (hrefLower.startsWith("tel:")) {
        reachMetrikaGoal(METRIKA_GOALS.PHONE_CLICK, { href });
        return;
      }

      if (hrefLower.includes("wa.me") || hrefLower.includes("whatsapp")) {
        reachMetrikaGoal(METRIKA_GOALS.WHATSAPP_CLICK, { href });
        return;
      }

      if (hrefLower.includes("t.me") || hrefLower.includes("telegram")) {
        reachMetrikaGoal(METRIKA_GOALS.TELEGRAM_CLICK, { href });
        return;
      }

      if (href === "/cart" || hrefLower.startsWith("/cart?")) {
        reachMetrikaGoal(METRIKA_GOALS.CART_OPEN);
      }
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const action = form.getAttribute("action") ?? "";
      const isSearch = form.getAttribute("role") === "search" || action.includes("/catalog");
      if (!isSearch) return;

      const query = getSearchQuery(form);
      if (query.length < 2) return;

      reachMetrikaGoal(METRIKA_GOALS.SITE_SEARCH, { query, source: "form" });
    }

    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  return null;
}
