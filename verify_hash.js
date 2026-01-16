
const bcrypt = require('bcryptjs');

const password = 'password123';
const hash = '$2a$10$Kv35ACoP2jiaoJqSsJYvYR9SYbK9/3ly';

bcrypt.compare(password, hash).then(res => {
    console.log(`Password '${password}' matches hash: ${res}`);
}).catch(err => {
    console.error("Error:", err);
});
