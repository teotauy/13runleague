/*
 * SQL to create the feedback table (run once in Supabase):
 *
 * create table feedback (
 *   id uuid primary key default gen_random_uuid(),
 *   message text not null,
 *   page_url text,
 *   member_name text,
 *   created_at timestamptz default now()
 * );
 */

import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, page_url, member_name } = body

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase.from('feedback').insert({
      message: message.trim(),
      page_url: page_url ?? null,
      member_name: member_name?.trim() || null,
    })

    if (error) throw error

    // Send email notification via Resend
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: 'colby@colbyangusblack.com',
          subject: '💬 New feedback on 13runleague',
          html: `
            <h2>New feedback submitted</h2>
            <p><strong>Message:</strong><br>${message.trim()}</p>
            <p><strong>From:</strong> ${member_name?.trim() || 'Anonymous'}</p>
            <p><strong>Page:</strong> <a href="${page_url}">${page_url}</a></p>
          `,
        }),
      }).catch(err => console.error('Resend error:', err))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Feedback insert error:', err)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
