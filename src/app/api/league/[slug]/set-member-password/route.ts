import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!isAdmin(authCookie?.value)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const body = await req.json()
  const { password } = body as { password: string }

  if (!password || password.length < 3) {
    return NextResponse.json({ error: 'Password must be at least 3 characters' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 10)

  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('leagues')
    .update({ member_password_hash: hash })
    .eq('id', league.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
