import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const password = 'qawZeg-gosnaz-0gyfhy'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setPassword() {
  const hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabase
    .from('leagues')
    .update({ password_hash: hash })
    .eq('slug', 'south-brooklyn')
    .select()

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log('✓ Password updated successfully')
  console.log('League:', data[0]?.name)
  console.log('Slug:', data[0]?.slug)
}

setPassword()
