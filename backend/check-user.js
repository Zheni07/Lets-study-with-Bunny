const { query } = require('./src/db/db');

async function checkUser() {
  try {
    const rows = await query('SELECT id, email FROM users WHERE email = $1', ['jenijivkova07@gmail.com']);
    console.log('User found:', rows);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();