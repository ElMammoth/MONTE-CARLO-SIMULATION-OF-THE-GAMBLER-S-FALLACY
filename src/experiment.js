/**
 * The gambler's fallacy experiment.
 *
 * Plays `n` rounds at a fixed target and bet, then asks the only question that
 * matters: conditional on having just observed k consecutive losses, what
 * happened on the very next round? Compares each observed rate against the
 * theoretical RTP / target, which is independent of everything that came before.
 */
async function runTest(n = 100000, target = 2.00, betAmount = 1.00) {
    console.log(`Running ${n} bets with target ${target.toFixed(2)}× and bet ${betAmount.toFixed(2)}...`);
    
    const savedState = saveState();
    
    resetNonce();
    resetStats();
    resetBalance();
    
    const TARGET = Math.floor(target * 100) / 100;
    const BET = Math.floor(betAmount * 100) / 100;
    const startTime = Date.now();
    
    // Full win/loss sequence, kept for the streak analysis below
    let fullHistory = [];
    
    let i = 0;
    for (i = 0; i < n; i++) {
        if (!canPlaceBet(BET)) {
            console.log(`Stopped at bet ${i}: Cannot place bet (balance: ${getBalance().toFixed(2)})`);
            break;
        }
        
        const betPlaced = placeBet(BET);
        
        if (!betPlaced) {
            console.log(`Stopped at bet ${i}: Cannot place bet`);
            break;
        }
        
        const currentNonce = getNonce();
        const m = await calculateMultiplier(currentNonce);
        const win = isWin(m, TARGET);
        
        if (win && BET > 0) {
            addWinnings(BET, TARGET);
        }
        
        addBetResult(m, win, BET, TARGET);
        incrementNonce();
        
        // Append to the full sequence
        fullHistory.push(win);
    }
    
    // Walk the sequence and attribute each round to the streak that preceded it
    console.log('\n🔍 Analyse des suites de pertes...');
    
    // Per streak length k: how often we stood at k losses, and what came next
    let lossStreakStats = {};
    let currentLossStreak = 0;
    
    for (let i = 0; i < fullHistory.length; i++) {
        const currentWin = fullHistory[i];
        
        if (!currentWin) {
            // A loss extends the current streak
            currentLossStreak++;
        } else {
            // A win closes the streak, so attribute every length it passed through
            if (currentLossStreak > 0) {
                // A streak of length L means we stood at k = 1..L losses at some
                // point. Each of those is one observation of "k losses had just
                // happened"; the next round was a loss for every k < L (the streak
                // continued) and a win only at k = L (the streak ended here).
                for (let k = 1; k <= currentLossStreak; k++) {
                    if (!lossStreakStats[k]) {
                        lossStreakStats[k] = { occurrences: 0, wins: 0, losses: 0 };
                    }
                    lossStreakStats[k].occurrences++;
                    
                    if (k === currentLossStreak) {
                        // Terminal length: the next round was the win
                        lossStreakStats[k].wins++;
                    } else {
                        // Intermediate length: the next round was another loss
                        lossStreakStats[k].losses++;
                    }
                }
            }
            currentLossStreak = 0;
        }
    }
    
    // A streak still open when the run ends is censored: count it as a loss
    if (currentLossStreak > 0) {
        for (let k = 1; k <= currentLossStreak; k++) {
            if (!lossStreakStats[k]) {
                lossStreakStats[k] = { occurrences: 0, wins: 0, losses: 0 };
            }
            lossStreakStats[k].occurrences++;
            lossStreakStats[k].losses++; // Unfinished streak counts as a loss
        }
    }
    
    const elapsed = Date.now() - startTime;
    const stats = getStats();
    
    // Record the trailing loss streak, which no win ever closed
    if (stats.currentLossStreak > 0) {
        stats.lossStreakCounts[stats.currentLossStreak] = (stats.lossStreakCounts[stats.currentLossStreak] || 0) + 1;
    }
    
    const expectedWinrate = (getRTP() / TARGET * 100);
    const theoreticalLossRate = 100 - expectedWinrate;
    
    console.log(`\n========== TEST RESULTS ==========`);
    console.log(`Completed ${stats.totalBets} bets in ${elapsed}ms`);
    console.log(`\n--- Win/Loss Statistics ---`);
    console.log(`Observed winrate: ${stats.winrate.toFixed(2)}%`);
    console.log(`Expected winrate: ~${expectedWinrate.toFixed(2)}%`);
    console.log(`Wins: ${stats.wins}, Losses: ${stats.losses}`);
    console.log(`\n--- Loss Streak Statistics ---`);
    console.log(`Max loss streak: ${stats.maxLossStreak} consecutive losses`);
    console.log(`\nDetailed loss streak distribution:`);
    
    const sortedStreaks = Object.keys(stats.lossStreakCounts)
        .map(k => parseInt(k))
        .sort((a, b) => a - b);
    
    for (const streakLength of sortedStreaks) {
        const count = stats.lossStreakCounts[streakLength];
        console.log(`  ${streakLength} consecutive loss${streakLength > 1 ? 'es' : ''}: ${count} occurrence${count > 1 ? 's' : ''}`);
    }
    
    // The core result: outcome of the round following each streak length
    console.log(`\n--- Stats du coup suivant chaque suite de pertes ---`);
    console.log(`Format: Longueur | Occurrences | Gains | Pertes | Win Rate | Loss Rate | Théorique`);
    console.log(`-------------------------------------------------------------------------------------`);
    
    const sortedStreakKeys = Object.keys(lossStreakStats)
        .map(k => parseInt(k))
        .sort((a, b) => a - b);
    
    for (const k of sortedStreakKeys) {
        const stat = lossStreakStats[k];
        const winRate = stat.occurrences > 0 ? (stat.wins / stat.occurrences * 100) : 0;
        const lossRate = stat.occurrences > 0 ? (stat.losses / stat.occurrences * 100) : 0;
        
        console.log(`Après ${k} perte${k > 1 ? 's' : ''}: ${stat.occurrences} fois | ${stat.wins} gains | ${stat.losses} pertes | Win: ${winRate.toFixed(2)}% | Loss: ${lossRate.toFixed(2)}% | Théo: ${theoreticalLossRate.toFixed(2)}%`);
    }
    
    console.log(`\n--- Analyse comparative ---`);
    console.log(`Probabilité théorique de perte (indépendante): ${theoreticalLossRate.toFixed(2)}%`);
    console.log(`\nÉcarts observés vs théorique :`);
    
    for (const k of sortedStreakKeys) {
        const stat = lossStreakStats[k];
        const observedLossRate = stat.occurrences > 0 ? (stat.losses / stat.occurrences * 100) : 0;
        const deviation = observedLossRate - theoreticalLossRate;
        const deviationPercent = theoreticalLossRate > 0 ? ((deviation / theoreticalLossRate) * 100) : 0;
        
        const arrow = deviation > 0 ? '↑' : deviation < 0 ? '↓' : '→';
        const color = Math.abs(deviationPercent) < 5 ? '✓' : Math.abs(deviationPercent) < 10 ? '⚠' : '⚠⚠';
        
        console.log(`  ${k} perte${k > 1 ? 's' : ''}: ${observedLossRate.toFixed(2)}% ${arrow} (${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}% / ${deviationPercent > 0 ? '+' : ''}${deviationPercent.toFixed(1)}%) ${color}`);
    }
    
    console.log(`\n--- Financial Statistics ---`);
    console.log(`Total wagered: ${stats.totalWagered.toFixed(2)}€`);
    console.log(`Total won: ${stats.totalWon.toFixed(2)}€`);
    console.log(`Net profit: ${stats.netProfit.toFixed(2)}€`);
    console.log(`Final balance: ${getBalance().toFixed(2)}€`);
    console.log(`==================================\n`);
    
    restoreState(savedState);
    updateUI(savedState.history[0] || 0);
}
