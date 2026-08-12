import { ColorMode, PriceBreakdown, Shop } from './types';

export function calculatePrintPrice(
  shop: Partial<Shop>,
  pageCount: number,
  copies: number,
  colorMode: ColorMode
): PriceBreakdown {
  const ratePerPage =
    colorMode === 'color'
      ? Number(shop.price_per_page_color ?? 10)
      : Number(shop.price_per_page_bw ?? 2);

  const safePageCount = Math.max(1, pageCount || 1);
  const safeCopies = Math.max(1, copies || 1);
  const totalPages = safePageCount * safeCopies;
  const subtotal = ratePerPage * totalPages;
  const totalPrice = Math.round(subtotal * 100) / 100;

  return {
    page_count: safePageCount,
    copies: safeCopies,
    color_mode: colorMode,
    rate_per_page: ratePerPage,
    subtotal,
    total_pages: totalPages,
    total_price: totalPrice,
  };
}

export function isShopOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  const lastSeenTime = new Date(lastSeen).getTime();
  const now = Date.now();
  // Shop agent is considered online if heartbeat was within the last 90 seconds
  return now - lastSeenTime <= 90 * 1000;
}
