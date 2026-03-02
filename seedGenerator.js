function generateRandomSeed(length = 64) {
    const array = new Uint8Array(length / 2);
    crypto.getRandomValues(array);
    return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function generateClientSeed() {
    return `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function initializeSeeds() {
    const serverSeed = generateRandomSeed(64);
    const clientSeed = generateClientSeed();
    return { serverSeed, clientSeed };
}