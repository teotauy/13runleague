import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPassword() {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, slug, password_hash')
    .eq('slug', 'south-brooklyn')
    .single()

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log('League found:', data.name)
  console.log('Slug:', data.slug)
  console.log('Password hash exists:', !!data.password_hash)
  console.log('Hash length:', data.password_hash?.length)
  console.log('Hash:', data.password_hash)
}

checkPassword()
