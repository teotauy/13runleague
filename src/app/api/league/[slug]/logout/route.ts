import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const cookieStore = await cookies()

  // Clear the auth cookie — delete both path variants to be safe
  cookieStore.delete(`league_auth_${slug}`)

  // Also explicitly expire any lingering narrow-path cookie
  cookieStore.set(`league_auth_${slug}`, '', {
    maxAge: 0,
    path: `/league/${slug}`,
  })
  cookieStore.set(`league_auth_${slug}`, '', {
    maxAge: 0,
    path: '/',
  })

  return NextResponse.redirect(new URL(`/league/${slug}/login`, _req.url))
}
