import type { Metadata } from "next";
import { AccountPanel } from "../components/auth/AccountPanel";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountPage() {
  return <AccountPanel />;
}

