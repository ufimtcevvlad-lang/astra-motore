"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * true на клиенте после гидрации, false на сервере.
 * Замена useState+useEffect для порталов и window/localStorage без setState в эффекте.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
