import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const body = await req.json()

  try {
    // Check if payment record exists
    const { data: existing } = await supabase
      .from('weekly_payments')
      .select('id')
      .eq('member_id', body.member_id)
      .eq('week_number', body.week_number)
      .single()

    let result

    if (existing) {
      // Update existing record
      result = await supabase
        .from('weekly_payments')
        .update({
          payment_status: body.payment_status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // Create new record
      result = await supabase
        .from('weekly_payments')
        .insert({
          member_id: body.member_id,
          week_number: body.week_number,
          payment_status: body.payment_status,
        })
        .select()
        .single()
    }

    if (result.error) throw result.error

    return NextResponse.json(result.data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
  }
}
