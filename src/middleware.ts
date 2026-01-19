import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect dashboard routes
 * Redirects unauthenticated users to login page
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth session cookie (Neon Auth uses this pattern)
  const sessionCookie = request.cookies.get('neon-auth-session') || 
                        request.cookies.get('better-auth.session_token') ||
                        request.cookies.get('__session');

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/api/auth'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // API routes should be handled separately
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // If on a public route and has session, redirect to dashboard
  if (isPublicRoute && sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If trying to access dashboard without session, redirect to login
  if (pathname.startsWith('/dashboard') && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Root path redirects
  if (pathname === '/') {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
