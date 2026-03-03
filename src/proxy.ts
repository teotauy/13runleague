import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
      // Redirect to login page for this league
      const loginUrl = new URL(`/league/${slug}/login`, request.url)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/league/:path*'],
}
