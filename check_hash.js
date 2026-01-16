const bcrypt = require('bcryptjs');

const password = 'password123';
const hash = '$2a$10$z6eiqThxNxu3uq2YcQ1w3etJ8/tpzyt7RVdfScZdzVhloslm.w7fe';

async function check() {
    const isMatch = await bcrypt.compare(password, hash);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log(`Match: ${isMatch}`);

    if (!isMatch) {
        const newHash = await bcrypt.hash(password, 10);
        console.log(`Correct Hash for '${password}': ${newHash}`);
    }
}

check();
