let balance = 1000.00;
const INITIAL_BALANCE = 1000.00;

function setInitialBalance(amount) {
    balance = Math.max(0, amount);
}

function getBalance() {
    return balance;
}

function resetBalance() {
    balance = INITIAL_BALANCE;
}

function placeBet(betAmount) {
    if (betAmount === 0) {
        return true; // Permet de parier 0 pour mode démo
    }
    if (betAmount > balance || betAmount < 0) {
        return false;
    }
    balance -= betAmount;
    balance = Math.max(0, balance);
    return true;
}

function addWinnings(betAmount, targetMultiplier) {
    if (betAmount === 0) {
        return 0; // Pas de gains si mise à 0
    }
    const winnings = betAmount * targetMultiplier;
    balance += winnings;
    return winnings;
}

function canPlaceBet(betAmount) {
    if (betAmount === 0) {
        return true; // Toujours possible de parier 0
    }
    return betAmount > 0 && betAmount <= balance && balance >= 0;
}