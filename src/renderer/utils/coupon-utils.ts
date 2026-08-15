/**
 * coupon-utils.ts — Coupon validation and discount calculation.
 *
 * Replicates the website's loyaltyCalculations.js logic EXACTLY.
 * The same coupon MUST produce the identical discount on both sides.
 *
 * Key behaviours:
 *   - Percentage discounts use Math.floor (round DOWN), not Math.round
 *   - Firestore Timestamps are handled via .toDate() or ISO string parsing
 *   - free_product and free_delivery types produce zero discount (informational only)
 */

// ── Type (subset of PosCoupon from firestore-pos.ts) ──

export interface CouponData {
  id?: string;
  code: string;
  name?: string;
  type?: string;             // the website may use 'type' or 'discountType'
  discountType?: string;     // canonical: 'percentage' | 'fixed' | 'free_product' | 'free_delivery'
  discountValue?: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  usedCount?: number;
  startsAt?: any;            // Firestore Timestamp {toDate: fn} or ISO string
  expiresAt?: any;           // Firestore Timestamp {toDate: fn} or ISO string
  active?: boolean;
  freeProductName?: string;
  freeProductId?: string;
}

export interface CouponResult {
  valid: boolean;
  discount: number;
  finalTotal: number;
  type?: string;
  freeProduct?: string;      // populated for free_product type
  reason?: string;           // populated on failure
}

// ── Helpers ──

/** Converts a Firestore Timestamp or ISO string to a Date. */
function toDate(val: any): Date | null {
  if (!val) return null;
  if (val.toDate && typeof val.toDate === 'function') return val.toDate();
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (val instanceof Date) return val;
  return null;
}

function getDiscountType(coupon: CouponData): string {
  return (coupon.discountType || coupon.type || '').toLowerCase();
}

// ── Validation ──

export function isCouponValid(coupon: CouponData | null | undefined): boolean {
  if (!coupon) return false;
  if (coupon.active === false) return false;

  const now = new Date();

  const expiresAt = toDate(coupon.expiresAt);
  if (expiresAt && now > expiresAt) return false;

  const startsAt = toDate(coupon.startsAt);
  if (startsAt && now < startsAt) return false;

  const limit = Number(coupon.usageLimit || 0);
  if (limit > 0 && (Number(coupon.usedCount || 0)) >= limit) return false;

  return true;
}

// ── Discount Calculation ──

export function applyCouponDiscount(
  cartTotal: number,
  coupon: CouponData | null | undefined,
): CouponResult {
  const result: CouponResult = {
    valid: false,
    discount: 0,
    finalTotal: Math.max(0, Number(cartTotal)),
  };

  if (!isCouponValid(coupon)) {
    result.reason = 'Coupon is invalid or expired';
    return result;
  }

  const total = Math.max(0, Number(cartTotal));
  const discountType = getDiscountType(coupon!);

  // Minimum order amount check
  if (coupon!.minOrderAmount && total < Number(coupon!.minOrderAmount)) {
    result.reason = `Minimum order of ${coupon!.minOrderAmount} not met`;
    return result;
  }

  // ── Percentage ──
  if (discountType === 'percentage') {
    let discount = Math.floor((total * Number(coupon!.discountValue || 0)) / 100);
    if (coupon!.maxDiscount) {
      discount = Math.min(discount, Number(coupon!.maxDiscount));
    }
    result.discount = discount;
    result.finalTotal = Math.max(0, total - discount);
    result.valid = true;
    result.type = 'percentage';
    return result;
  }

  // ── Fixed amount ──
  if (discountType === 'fixed') {
    const discount = Math.min(Number(coupon!.discountValue || 0), total);
    result.discount = discount;
    result.finalTotal = Math.max(0, total - discount);
    result.valid = true;
    result.type = 'fixed';
    return result;
  }

  // ── Free product ──
  if (discountType === 'free_product' && coupon!.freeProductName) {
    result.valid = true;
    result.discount = 0;
    result.finalTotal = total;
    result.type = 'free_product';
    result.freeProduct = coupon!.freeProductName;
    return result;
  }

  // ── Free delivery ──
  if (discountType === 'free_delivery') {
    result.valid = true;
    result.discount = 0;
    result.finalTotal = total;
    result.type = 'free_delivery';
    return result;
  }

  // Unknown type
  result.reason = `Unknown coupon type: ${discountType}`;
  return result;
}
