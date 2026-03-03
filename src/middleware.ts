import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Extract slug from /league/[slug]/...
  const slugMatch = pathname.match(/^\/league\/([^/]+)/)
  if (!slugMatch) {
    return NextResponse.next()
  }

  const slug = slugMatch[1]
  const cookieName = `league_auth_${slug}`

  // Check for authentication cookie
  const authCookie = request.cookies.get(cookieName)

  // If no auth cookie, redirect to login
  if (!authCookie) {
    const loginUrl = new URL(`/league/${slug}/login`, request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If authenticated, continue with the request
  const response = NextResponse.next()

  // Add noindex header to prevent search engine indexing of private leagues
  response.headers.set('X-Robots-Tag', 'noindex')

  return response
}

export const config = {
  matcher: ['/league/:slug/((?!login).*)'],
}
