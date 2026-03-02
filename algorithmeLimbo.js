const RTP = 0.99;
let SERVER_SEED = null;
let CLIENT_SEED = null;

function setSeeds(serverSeed, clientSeed) {
    SERVER_SEED = serverSeed;
    CLIENT_SEED = clientSeed;
}

async function hmacSHA256(key, message) {
    const encoder = new TextEncoder();
    const keyData = new Uint8Array(key.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const messageData = encoder.encode(message);
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function calculateMultiplier(nonce) {
    const message = `${CLIENT_SEED}:${nonce}:0`;
    const hash = await hmacSHA256(SERVER_SEED, message);
    
    const hex13 = hash.substring(0, 13);
    const r = parseInt(hex13, 16);
    const u = (r + 1) / Math.pow(2, 52);
    
    const raw = RTP / u;
    const m = Math.max(1.00, Math.min(1000000.00, Math.floor(raw * 100) / 100));
    
    return m;
}

function isWin(multiplier, target) {
    return multiplier >= target;
}

function getRTP() {
    return RTP;
}