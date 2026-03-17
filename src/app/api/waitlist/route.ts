// SQL to create the waitlist table (run once in Supabase SQL editor):
//
// create table waitlist (
//   id uuid primary key default gen_random_uuid(),
//   name text,
//   email text not null unique,
//   created_at timestamptz default now()
// );

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('waitlist')
      .insert({ name: name?.trim() || null, email: email.trim().toLowerCase() })

    if (error) {
      if (error.code === '23505') {
        // Already on the list — treat as success
        return NextResponse.json({ ok: true, already: true })
      }
      throw error
    }

    // Send confirmation email via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: email.trim().toLowerCase(),
          subject: "You're on the 13 Run League waitlist 🔥",
          html: `
            <div style="background:#0a0a0a;color:#fff;font-family:monospace;padding:40px;max-width:500px;margin:0 auto;">
              <p style="color:#39ff14;font-size:32px;font-weight:900;margin:0 0 16px;">13</p>
              <h1 style="font-size:20px;margin:0 0 12px;">You're in${name ? `, ${name.split(' ')[0]}` : ''}.</h1>
              <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 24px;">
                We'll send you the best 13-run moments of the season and let you know when spots open up for next year.
              </p>
              <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 24px;">
                In the meantime, check out how often your favorite team scores 13:
              </p>
              <a href="https://13runleague.com/teams" style="display:inline-block;background:#39ff14;color:#000;font-weight:900;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">
                Explore the data →
              </a>
              <p style="color:#555;font-size:12px;margin-top:32px;">13runleague.com</p>
            </div>
          `,
        }),
      }).catch(() => {
        // Don't fail the request if email fails
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
