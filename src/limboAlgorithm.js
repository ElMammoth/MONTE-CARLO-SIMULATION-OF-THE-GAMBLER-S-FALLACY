/**
 * The provably-fair Limbo multiplier.
 *
 * Each round's multiplier is derived deterministically from (serverSeed, clientSeed,
 * nonce) via HMAC-SHA256, which is what makes the game verifiable after the fact: the
 * operator commits to the server seed up front and reveals it later, so any round can
 * be recomputed. The nonce is the only input that advances, and it does so blindly —
 * no round can see what the previous ones produced. That independence is exactly the
 * property the experiment measures.
 */

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
    
    // Take the first 13 hex digits (52 bits, the largest integer width that stays exact
    // in a double) and map them to a uniform u in (0, 1].
    const hex13 = hash.substring(0, 13);
    const r = parseInt(hex13, 16);
    const u = (r + 1) / Math.pow(2, 52);

    // Inverting a uniform gives the Pareto-shaped payout curve: P(m >= t) = RTP / t.
    // The RTP factor is the house edge — at target 2.00× the win rate is 49.5%, not 50%.
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