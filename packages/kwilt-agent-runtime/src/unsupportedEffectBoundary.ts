export type UnsupportedEffectBoundary = {
  operationId: 'savings.coupon.apply_unsupported';
  participatingCapabilities: ['savings'];
  response: string;
};

const COUPON_APPLICATION_PATTERN =
  /(?:\bapply\b[^.!?]{0,100}\bcoupons?\b|\bcoupons?\b[^.!?]{0,100}\bapply\b)/i;

export function resolveUnsupportedEffectBoundary(prompt: string): UnsupportedEffectBoundary | null {
  if (!COUPON_APPLICATION_PATTERN.test(prompt.trim())) return null;
  return {
    operationId: 'savings.coupon.apply_unsupported',
    participatingCapabilities: ['savings'],
    response: 'Kwilt can’t apply coupons to a retailer order. I can help you review eligible offers or open the retailer’s coupon activation step.',
  };
}
