// Route detection for App.tsx. There is no React Router — routing is ordered
// string matching on window.location.pathname, which is exactly the kind of
// logic that regresses silently, so it lives in this dependency-free module
// where tests/unit/app-routing.test.ts can import it without dragging the
// whole component graph along.

export type Route = 'landing' | 'pricing' | 'checkout' | 'billing_3ds_return' | 'app' | 'billing_success' | 'terms' | 'privacy' | 'refund' | 'support';

export const detectInitialRoute = (): Route => {
  if (typeof window === 'undefined') return 'landing';
  const path = window.location.pathname;
  if (path.startsWith('/billing/3ds-return')) return 'billing_3ds_return';
  if (path.startsWith('/billing/success')) return 'billing_success';
  if (path.startsWith('/billing/cancel')) return 'pricing';
  if (path.startsWith('/checkout')) return 'checkout';
  if (path.startsWith('/pricing')) return 'pricing';
  if (path.startsWith('/terms')) return 'terms';
  if (path.startsWith('/privacy')) return 'privacy';
  if (path.startsWith('/refund')) return 'refund';
  if (path.startsWith('/support')) return 'support';
  if (path.startsWith('/app')) return 'app';
  return 'landing';
};

export const ROUTE_PATHS: Record<Route, string> = {
  landing: '/',
  pricing: '/pricing',
  checkout: '/checkout',
  billing_3ds_return: '/billing/3ds-return',
  app: '/app',
  billing_success: '/billing/success',
  terms: '/terms',
  privacy: '/privacy',
  refund: '/refund',
  support: '/support',
};
