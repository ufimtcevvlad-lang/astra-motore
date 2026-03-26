import { promises as fs } from "node:fs";
import path from "node:path";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSIONS } from "./legal-docs";

export type ConsentLogEntry = {
  event: string;
  consentPersonalData: boolean;
  consentMarketing?: boolean;
  createdAt: string;
  ip?: string;
  userAgent?: string;
  subject?: {
    email?: string;
    phone?: string;
    fullName?: string;
    login?: string;
  };
  legal: {
    effectiveDate: string;
    privacyPolicyVersion: string;
    consentPersonalDataVersion: string;
    cookiePolicyVersion: string;
    publicOfferVersion: string;
    returnsPolicyVersion: string;
    warrantyPolicyVersion: string;
  };
};

export async function appendConsentLog(entry: Omit<ConsentLogEntry, "createdAt" | "legal">) {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "consent-events.ndjson");
  await fs.mkdir(dir, { recursive: true });
  const payload: ConsentLogEntry = {
    ...entry,
    createdAt: new Date().toISOString(),
    legal: {
      effectiveDate: LEGAL_EFFECTIVE_DATE,
      privacyPolicyVersion: LEGAL_VERSIONS.privacyPolicy,
      consentPersonalDataVersion: LEGAL_VERSIONS.consentPersonalData,
      cookiePolicyVersion: LEGAL_VERSIONS.cookiePolicy,
      publicOfferVersion: LEGAL_VERSIONS.publicOffer,
      returnsPolicyVersion: LEGAL_VERSIONS.returnsPolicy,
      warrantyPolicyVersion: LEGAL_VERSIONS.warrantyPolicy,
    },
  };
  await fs.appendFile(file, JSON.stringify(payload) + "\n", "utf8");
}
