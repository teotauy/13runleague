import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { endpoint, p256dh, auth } = await request.json()

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing subscription fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ endpoint, p256dh, auth }, { onConflict: 'endpoint' })

    if (error) {
      console.error('[Push] Subscription save error:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Push] Subscribe route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
