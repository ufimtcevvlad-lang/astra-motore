import { SITE_URL } from "./site";

const INDEXNOW_KEY = "5f97943ceab374a214e158f0f77d918d";
const HOST = new URL(SITE_URL).host;
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

// Yandex endpoint pings Yandex directly. The shared api.indexnow.org would
// forward to Bing too, but Yandex is the primary target here.
const ENDPOINT = "https://yandex.com/indexnow";

const BATCH_SIZE = 10000;

export type IndexNowResult = {
  ok: boolean;
  status: number;
  total: number;
  batches: number;
  message?: string;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function notifyIndexNow(urls: string[]): Promise<IndexNowResult> {
  const list = Array.from(new Set(urls.filter(Boolean)));
  if (list.length === 0) {
    return { ok: true, status: 200, total: 0, batches: 0, message: "no urls" };
  }

  const batches = chunk(list, BATCH_SIZE);
  let lastStatus = 0;
  let firstError: string | undefined;

  for (const batch of batches) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: HOST,
          key: INDEXNOW_KEY,
          keyLocation: KEY_LOCATION,
          urlList: batch,
        }),
      });
      lastStatus = res.status;
      // 200 OK, 202 Accepted are both success per IndexNow spec
      if (res.status !== 200 && res.status !== 202) {
        const text = await res.text().catch(() => "");
        if (!firstError) firstError = `HTTP ${res.status}: ${text.slice(0, 200)}`;
      }
    } catch (e) {
      lastStatus = 0;
      if (!firstError) firstError = e instanceof Error ? e.message : "fetch error";
    }
  }

  return {
    ok: lastStatus === 200 || lastStatus === 202,
    status: lastStatus,
    total: list.length,
    batches: batches.length,
    message: firstError,
  };
}
