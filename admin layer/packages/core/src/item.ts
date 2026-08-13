export const ITEM_STATUSES = ["draft", "published", "archived"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/**
 * Generická obsahová entita. Metadata spravuje Admin Layer,
 * obsahová pole jsou dána manifestem (kinds[].fields).
 */
export interface ContentItem {
  id: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  [field: string]: unknown;
}
