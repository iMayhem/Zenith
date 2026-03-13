import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    const userAgent = request.headers.get('user-agent') || '';

    // Extremely basic mobile device detection relying on standard regex
    const isMobile = Boolean(userAgent.match(
        /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
    ));

    const isMobileRoute = url.pathname.startsWith('/mobile');

    // Prevent routing loops on static assets or API routes
    if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api') || url.pathname.includes('.')) {
        return NextResponse.next();
    }

    if (isMobile && !isMobileRoute) {
        // If the user is on a mobile device but attempting to view desktop routes like /home, send to /mobile
        url.pathname = '/mobile';
        return NextResponse.redirect(url);
    }

    if (!isMobile && isMobileRoute) {
        // If a desktop user somehow navigates to /mobile, bump them to the standard desktop /home route
        url.pathname = '/home';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

// Optionally scope the middleware to pages we actually care about
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};
