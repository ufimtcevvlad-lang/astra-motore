import { getAllProducts } from "../src/app/lib/products-db";
import { productPath } from "../src/app/lib/product-slug";

const KEY = "gmshop66-indexnow-20260403";
const HOST = "gmshop66.ru";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const siteUrl = `https://${HOST}`;

async function main() {
  const products = getAllProducts();
  const urlList = [
    siteUrl,
    `${siteUrl}/catalog`,
    `${siteUrl}/contacts`,
    `${siteUrl}/how-to-order`,
    `${siteUrl}/zapchasti-gm`,
    `${siteUrl}/zapchasti-opel`,
    `${siteUrl}/zapchasti-chevrolet`,
    ...products.map((p) => `${siteUrl}${productPath(p)}`),
  ];

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  const res = await fetch("https://yandex.com/indexnow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`IndexNow error ${res.status}: ${text}`);
  }

  console.log(text || "ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
