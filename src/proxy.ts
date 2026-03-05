import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Cookie value is 'admin', 'member', or legacy 'authenticated' (treated as admin)
function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply noindex header to all /league/* routes
  if (pathname.startsWith('/league/')) {
    const response = NextResponse.next()
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')

    // Extract slug from /league/[slug]/...
    const parts = pathname.split('/')
    const slug = parts[2]

    if (!slug) return response

    // Allow the login page through — otherwise the redirect loops forever
    if (pathname === `/league/${slug}/login`) return response

    // Check auth cookie
    const cookieName = `league_auth_${slug}`
    const authCookie = request.cookies.get(cookieName)

    if (!authCookie?.value) {
      // No cookie at all — redirect to login
      const loginUrl = new URL(`/league/${slug}/login`, request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Admin-only routes: /admin and /draft
    const isAdminRoute =
      pathname === `/league/${slug}/admin` ||
      pathname.startsWith(`/league/${slug}/admin/`) ||
      pathname === `/league/${slug}/draft` ||
      pathname.startsWith(`/league/${slug}/draft/`)

    if (isAdminRoute && !isAdmin(authCookie.value)) {
      // Member trying to access admin — redirect to league dashboard
      const dashboardUrl = new URL(`/league/${slug}`, request.url)
      return NextResponse.redirect(dashboardUrl)
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/league/:path*'],
}
