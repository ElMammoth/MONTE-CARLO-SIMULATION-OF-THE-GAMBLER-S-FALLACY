let intervalId = null;
let running = false;

async function step() {
    const target = getTargetFromInput();
    const betAmount = getBetAmountFromInput();
    
    if (!canPlaceBet(betAmount)) {
        showError('Mise invalide - Jeu arrêté !');
        stop();
        return;
    }
    
    const betPlaced = placeBet(betAmount);
    
    if (!betPlaced) {
        showError('Impossible de placer le pari - Jeu arrêté !');
        stop();
        return;
    }
    
    const currentNonce = getNonce();
    const m = await calculateMultiplier(currentNonce);
    
    const win = isWin(m, target);
    
    if (win && betAmount > 0) {
        addWinnings(betAmount, target);
    }
    
    addBetResult(m, win, betAmount, target);
    incrementNonce();
    
    updateUI(m);
}

function start() {
    const betAmount = getBetAmountFromInput();
    
    if (!canPlaceBet(betAmount)) {
        showError('Mise invalide !');
        return;
    }
    
    if (!running) {
        running = true;
        setRunningUI(true);
        intervalId = setInterval(step, 250);
    }
}

function stop() {
    if (running) {
        running = false;
        setRunningUI(false);
        clearInterval(intervalId);
        intervalId = null;
    }
}

function toggle() {
    if (running) {
        stop();
    } else {
        start();
    }
}

async function runTest(n = 100000, target = 2.00, betAmount = 1.00) {
    console.log(`Running ${n} bets with target ${target.toFixed(2)}× and bet ${betAmount.toFixed(2)}...`);
    
    const savedState = saveState();
    
    resetNonce();
    resetStats();
    resetBalance();
    
    const TARGET = Math.floor(target * 100) / 100;
    const BET = Math.floor(betAmount * 100) / 100;
    const startTime = Date.now();
    
    // Historique complet pour analyse des suites
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
        
        // Enregistrer dans l'historique complet
        fullHistory.push(win);
    }
    
    // Analyse correcte de l'historique
    console.log('\n🔍 Analyse des suites de pertes...');
    
    // Stats pour chaque longueur de suite de pertes
    let lossStreakStats = {};
    let currentLossStreak = 0;
    
    for (let i = 0; i < fullHistory.length; i++) {
        const currentWin = fullHistory[i];
        
        if (!currentWin) {
            // C'est une perte
            currentLossStreak++;
        } else {
            // C'est un gain - analyse de la suite qui vient de se terminer
            if (currentLossStreak > 0) {
                // Pour chaque longueur de 1 à currentLossStreak, 
                // on enregistre qu'il y a eu un gain après cette longueur
                for (let k = 1; k <= currentLossStreak; k++) {
                    if (!lossStreakStats[k]) {
                        lossStreakStats[k] = { occurrences: 0, wins: 0, losses: 0 };
                    }
                    lossStreakStats[k].occurrences++;
                    
                    if (k === currentLossStreak) {
                        // Pour la longueur finale, c'est un gain
                        lossStreakStats[k].wins++;
                    } else {
                        // Pour les longueurs intermédiaires, c'est une perte (la suite a continué)
                        lossStreakStats[k].losses++;
                    }
                }
            }
            currentLossStreak = 0;
        }
    }
    
    // Si on termine sur une suite de pertes, on les compte aussi
    if (currentLossStreak > 0) {
        for (let k = 1; k <= currentLossStreak; k++) {
            if (!lossStreakStats[k]) {
                lossStreakStats[k] = { occurrences: 0, wins: 0, losses: 0 };
            }
            lossStreakStats[k].occurrences++;
            lossStreakStats[k].losses++; // Suite inachevée = perte
        }
    }
    
    const elapsed = Date.now() - startTime;
    const stats = getStats();
    
    // Enregistrer la dernière série de pertes si elle existe
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
    
    // Afficher les stats du coup suivant chaque longueur de suite
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