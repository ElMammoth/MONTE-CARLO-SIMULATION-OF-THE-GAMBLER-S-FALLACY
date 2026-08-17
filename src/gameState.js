let nonce = 0;
let totalBets = 0;
let wins = 0;
let losses = 0;
let history = [];
let totalWagered = 0;
let totalWon = 0;
let currentLossStreak = 0;
let maxLossStreak = 0;
let currentWinStreak = 0;
let maxWinStreak = 0;
let lossStreakCounts = {}; // Histogram: streak length -> number of times observed

function resetNonce() {
    nonce = 0;
}

function incrementNonce() {
    nonce++;
}

function getNonce() {
    return nonce;
}

function addBetResult(multiplier, isWin, betAmount, targetMultiplier) {
    totalBets++;
    totalWagered += betAmount;
    
    if (isWin) {
        wins++;
        const winnings = betAmount * targetMultiplier;
        totalWon += winnings;
        
        // A win closes any loss streak, so record its length
        if (currentLossStreak > 0) {
            lossStreakCounts[currentLossStreak] = (lossStreakCounts[currentLossStreak] || 0) + 1;
        }
        
        // Update win streaks
        currentWinStreak++;
        if (currentWinStreak > maxWinStreak) {
            maxWinStreak = currentWinStreak;
        }
        currentLossStreak = 0;
    } else {
        losses++;
        
        // Update loss streaks
        currentLossStreak++;
        if (currentLossStreak > maxLossStreak) {
            maxLossStreak = currentLossStreak;
        }
        currentWinStreak = 0;
    }
    
    history.unshift(multiplier);
    if (history.length > 15) {
        history.pop();
    }
}

function getStats() {
    return {
        totalBets,
        wins,
        losses,
        history: [...history],
        winrate: totalBets > 0 ? (wins / totalBets * 100) : 0,
        totalWagered,
        totalWon,
        netProfit: totalWon - totalWagered,
        maxLossStreak,
        maxWinStreak,
        currentLossStreak,
        currentWinStreak,
        lossStreakCounts: {...lossStreakCounts}
    };
}

function resetStats() {
    totalBets = 0;
    wins = 0;
    losses = 0;
    history = [];
    totalWagered = 0;
    totalWon = 0;
    currentLossStreak = 0;
    maxLossStreak = 0;
    currentWinStreak = 0;
    maxWinStreak = 0;
    lossStreakCounts = {};
}

function saveState() {
    return {
        nonce,
        totalBets,
        wins,
        losses,
        history: [...history],
        totalWagered,
        totalWon,
        balance: getBalance(),
        currentLossStreak,
        maxLossStreak,
        currentWinStreak,
        maxWinStreak,
        lossStreakCounts: {...lossStreakCounts}
    };
}

function restoreState(state) {
    nonce = state.nonce;
    totalBets = state.totalBets;
    wins = state.wins;
    losses = state.losses;
    history = [...state.history];
    totalWagered = state.totalWagered;
    totalWon = state.totalWon;
    setInitialBalance(state.balance);
    currentLossStreak = state.currentLossStreak;
    maxLossStreak = state.maxLossStreak;
    currentWinStreak = state.currentWinStreak;
    maxWinStreak = state.maxWinStreak;
    lossStreakCounts = {...state.lossStreakCounts};
}