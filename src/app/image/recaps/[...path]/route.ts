import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'recap-images'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const storagePath = path.join('/')

  if (!storagePath || storagePath.includes('..')) {
    return new NextResponse('Not found', { status: 404 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath)

  if (error || !data) {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
