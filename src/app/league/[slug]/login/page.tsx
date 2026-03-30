import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function LeagueLoginPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { error } = await searchParams

  async function login(formData: FormData) {
    'use server'
    const password = formData.get('password') as string
    const supabase = createServiceClient()

    // Fetch core password hash (always present)
    const { data: league, error: dbError } = await supabase
      .from('leagues')
      .select('password_hash, member_password_hash')
      .eq('slug', slug)
      .single()

    if (dbError || !league) {
      redirect(`/league/${slug}/login?error=not_found`)
    }

    // Check admin password first
    const isAdmin = await bcrypt.compare(password, league.password_hash)
    if (isAdmin) {
      const cookieStore = await cookies()
      // Drop legacy cookie scoped to /league/[slug] only — it is not sent to /api/league/...
      cookieStore.set(`league_auth_${slug}`, '', {
        maxAge: 0,
        path: `/league/${slug}`,
      })
      cookieStore.set(`league_auth_${slug}`, 'admin', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        // `/` so the cookie is sent to `/api/league/...` routes (fetch from admin UI)
        path: '/',
      })
      redirect(`/league/${slug}/admin`)
    }

    // Check member (view-only) password
    if (league.member_password_hash) {
      const isMember = await bcrypt.compare(password, league.member_password_hash)
      if (isMember) {
        const cookieStore = await cookies()
        cookieStore.set(`league_auth_${slug}`, '', {
          maxAge: 0,
          path: `/league/${slug}`,
        })
        cookieStore.set(`league_auth_${slug}`, 'member', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })
        redirect(`/league/${slug}`)
      }
    }

    redirect(`/league/${slug}/login?error=invalid`)
  }

  return (
    <main className="min-h-screen bg-[#0f1115] stadium-texture flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            <span className="text-[#39ff14]">13</span> Run League
          </h1>
          <p className="text-gray-400 mt-2">Enter your league password</p>
          <p className="text-gray-500 text-sm mt-1 font-mono">{slug}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-950 border border-red-800 text-red-400 text-sm text-center">
            {error === 'invalid' ? 'Incorrect password. Try again.' : 'League not found.'}
          </div>
        )}

        <form action={login} className="space-y-4">
          <input
            type="password"
            name="password"
            required
            placeholder="League password"
            className="w-full px-4 py-3 rounded bg-[#111] border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-[#39ff14] transition-colors"
          />
          <button
            type="submit"
            className="w-full py-3 rounded bg-[#39ff14] text-black font-bold hover:bg-[#2de010] transition-colors"
          >
            Enter League
          </button>
        </form>
      </div>
    </main>
  )
}
