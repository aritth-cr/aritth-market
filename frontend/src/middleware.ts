import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/register(.*)',
  '/api/webhooks(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Rutas públicas - OK sin auth
  if (isPublicRoute(req)) return NextResponse.next();

  // Sin sesión → al login
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Rutas admin → verificar rol
  if (isAdminRoute(req)) {
    const role = (sessionClaims?.metadata as any)?.role;
    if (!role || !['SUPER_ADMIN', 'ADMIN', 'INVOICE_REVIEWER', 'FINANCE', 'OPERATIONS', 'SUPPORT'].includes(role)) {
      return NextResponse.redirect(new URL('/catalog', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
};
