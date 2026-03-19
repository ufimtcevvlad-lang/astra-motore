import type { Metadata } from "next";
import { SocialCompleteForm } from "../../components/auth/SocialCompleteForm";

export const metadata: Metadata = {
  title: "Завершение регистрации",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CompleteProfilePage() {
  return <SocialCompleteForm />;
}

