const CDEK_API_BASE = process.env.CDEK_API_BASE_URL || "https://api.cdek.ru/v2";

type TokenCache = {
  token: string;
  expiresAt: number;
};

type CdekPackage = {
  weight: number;
  length: number;
  width: number;
  height: number;
};

let tokenCache: TokenCache | null = null;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Не задана переменная окружения ${name}`);
  }
  return value;
}

async function getCdekToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 15_000) {
    return tokenCache.token;
  }

  const account = getEnv("CDEK_CLIENT_ID");
  const secure = getEnv("CDEK_CLIENT_SECRET");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: account,
    client_secret: secure,
  });

  const res = await fetch(`${CDEK_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`CDEK auth failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token || typeof data.expires_in !== "number") {
    throw new Error("CDEK auth returned invalid payload");
  }

  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

export async function calculateCdekTariffList(input: {
  toCity: string;
  packageData: CdekPackage;
  declaredValue: number;
}) {
  const token = await getCdekToken();
  const fromLocationCode = Number(getEnv("CDEK_FROM_LOCATION_CODE"));

  const res = await fetch(`${CDEK_API_BASE}/calculator/tarifflist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      from_location: { code: fromLocationCode },
      to_location: { city: input.toCity },
      packages: [input.packageData],
      services: [],
      currency: 1,
      lang: "rus",
      date: new Date().toISOString().slice(0, 10),
      value: Math.max(1, Math.round(input.declaredValue)),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CDEK calculate failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    tariff_codes?: Array<{
      tariff_code: number;
      tariff_name: string;
      delivery_sum: number;
      period_min?: number;
      period_max?: number;
    }>;
  };

  return data.tariff_codes ?? [];
}

export async function getCdekPickupPoints(city: string) {
  const token = await getCdekToken();
  const query = new URLSearchParams({
    city: city.trim(),
    type: "PVZ",
    size: "50",
    page: "0",
  });

  const res = await fetch(`${CDEK_API_BASE}/deliverypoints?${query.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CDEK pickup points failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as Array<{
    code: string;
    name: string;
    location?: {
      address_full?: string;
      address?: string;
      city?: string;
    };
    work_time?: string;
  }>;

  return data.map((point) => ({
    code: point.code,
    name: point.name,
    city: point.location?.city ?? "",
    address: point.location?.address_full ?? point.location?.address ?? "",
    workTime: point.work_time ?? "",
  }));
}

