import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const BUCKET = 'recap-images'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
])

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

async function ensureBucket(supabase: ReturnType<typeof createServiceClient>) {
  const { data: bucket } = await supabase.storage.getBucket(BUCKET)
  if (bucket) return

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: `${MAX_BYTES}`,
    allowedMimeTypes: [...ALLOWED_TYPES.keys()],
  })

  if (error && !/already exists/i.test(error.message)) {
    throw new Error(error.message)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie || !isAdmin(authCookie.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
  }

  const ext = ALLOWED_TYPES.get(file.type)
  if (!ext) {
    return NextResponse.json({ error: 'Use a JPG, PNG, GIF, or WebP image.' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Images must be 5MB or smaller.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  await ensureBucket(supabase)

  const now = new Date()
  const storagePath = [
    slug,
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    `${randomUUID()}.${ext}`,
  ].join('/')

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  return NextResponse.json({
    url: `${appUrl}/image/recaps/${storagePath}`,
    path: storagePath,
  })
}
