import bcrypt from 'bcryptjs'

const password = 'qawZeg-gosnaz-0gyfhy'
const hash = '$2b$10$OYaLQXPc5UJOVgh/Wtw2e.kcC9Srnt4ntSh2kMToz5aziEdj9dWqa'

async function test() {
  const valid = await bcrypt.compare(password, hash)
  console.log('Password valid:', valid)
}

test()
