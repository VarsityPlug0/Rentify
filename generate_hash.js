
const bcrypt = require('bcryptjs');
const fs = require('fs');

const password = 'password123';
bcrypt.hash(password, 10).then(hash => {
    console.log(`Hash for '${password}': ${hash}`);
    fs.writeFileSync('hash.txt', hash);
});
