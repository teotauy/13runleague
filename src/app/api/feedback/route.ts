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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Feedback insert error:', err)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
