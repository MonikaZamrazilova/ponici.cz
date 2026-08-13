import type { ContentItem } from "@admin/core";
import {
  faqFromItem,
  priceFromItem,
  serviceFromItem,
  siteFromItem,
  type FaqContent,
  type PriceContent,
  type ServiceContent,
  type SiteContent,
} from "./repository";

/**
 * Runtime obsah — web si v admin módu načte publikovaná data z adminu
 * (GET /api/projects/ponici/content), aby viděl změny bez rebuildu.
 * Běžní návštěvníci dostávají build-time bundle (repository.ts).
 */

export interface RuntimeContent {
  site: SiteContent;
  services: ServiceContent[];
  prices: PriceContent[];
  faqs: FaqContent[];
}

const PROJECT_ID = "ponici";

interface ContentResponse {
  ok: boolean;
  data?: { kinds?: Record<string, ContentItem[]> };
  error?: { message?: string };
}

export async function fetchRuntimeContent(): Promise<RuntimeContent | null> {
  try {
    const res = await fetch(`/api/projects/${PROJECT_ID}/content`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ContentResponse;
    if (!json.ok || !json.data?.kinds) return null;
    const kinds = json.data.kinds;
    return {
      site: siteFromItem((kinds["site"] ?? [])[0]),
      services: (kinds["service"] ?? []).map((item) => serviceFromItem(item)),
      prices: (kinds["price"] ?? []).map((item) => priceFromItem(item)),
      faqs: (kinds["faq"] ?? []).map((item) => faqFromItem(item)),
    };
  } catch {
    return null;
  }
}
