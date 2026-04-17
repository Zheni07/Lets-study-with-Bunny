const bcrypt = require('bcrypt');

async function test() {
  const password = 'Test123@';
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash:', hash);
  const isValid = await bcrypt.compare(password, hash);
  console.log('Valid:', isValid);
  const wrong = await bcrypt.compare('wrong', hash);
  console.log('Wrong valid:', wrong);
}

test();