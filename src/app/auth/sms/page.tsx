import type { Metadata } from "next";
import { SmsLoginForm } from "../../components/auth/SmsLoginForm";

export const metadata: Metadata = {
  title: "Вход по SMS",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SmsLoginPage() {
  return <SmsLoginForm />;
}

