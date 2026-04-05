import type { MetadataRoute } from "next";
import { DEFAULT_META_DESCRIPTION } from "./lib/seo";
import { SITE_BRAND } from "./lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_BRAND,
    short_name: SITE_BRAND,
    description: DEFAULT_META_DESCRIPTION,
    start_url: "/",
    display: "browser",
    background_color: "#f8fafc",
    theme_color: "#05070A",
    lang: "ru",
    dir: "ltr",
    icons: [
      {
        src: "/favicon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
