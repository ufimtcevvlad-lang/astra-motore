"use client";

import { useEffect, useRef } from "react";

export default function AdminNotifications() {
  const lastUnreadRef = useRef<number | null>(null);

  useEffect(() => {
    // Register service worker and push subscription
    async function setupPush() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
      if (!("PushManager" in window)) return;

      try {
        const registration = await navigator.serviceWorker.register("/sw-push.js");

        // Get VAPID key
        const keyRes = await fetch("/api/admin/vapid-key");
        if (!keyRes.ok) return;
        const { vapidPublicKey } = await keyRes.json();
        if (!vapidPublicKey) return;

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Subscribe to push
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        // Send subscription to server
        await fetch("/api/admin/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch {
        // Push setup failed gracefully
      }
    }

    setupPush();
  }, []);

  useEffect(() => {
    // Sound notification polling
    const soundEnabled = () => {
      try {
        return localStorage.getItem("chat_sound") !== "off";
      } catch {
        return true;
      }
    };

    async function checkUnread() {
      try {
        const res = await fetch("/api/admin/conversations/unread-count");
        if (!res.ok) return;
        const data = await res.json();
        const count: number = data.unreadCount ?? 0;

        if (lastUnreadRef.current === null) {
          // Initial load — set baseline without playing sound
          lastUnreadRef.current = count;
          return;
        }

        if (count > lastUnreadRef.current && soundEnabled()) {
          playNotificationSound();
        }
        lastUnreadRef.current = count;
      } catch {}
    }

    checkUnread();
    const interval = setInterval(checkUnread, 5000);
    return () => clearInterval(interval);
  }, []);

  return null;
}

function playNotificationSound() {
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Autoplay blocked or file missing — fail silently
    });
  } catch {
    // Audio not supported
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
