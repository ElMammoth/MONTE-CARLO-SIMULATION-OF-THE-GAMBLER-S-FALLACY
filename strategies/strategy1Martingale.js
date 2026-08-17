/**
 * Strategy 1: capped martingale entered after a loss streak.
 *
 * This is the bet the gambler's fallacy talks you into — wait for a "due" run of
 * losses, then double up until it corrects — measured against the same generator
 * the experiment shows to be memoryless.
 *
 * Parameters:
 * - rounds         : number of rounds to simulate (default: 1000)
 * - initialBalance : starting balance (default: 1000 €)
 * - lossTrigger    : consecutive losses required before betting starts (default: 6)
 * - maxBet         : largest stake allowed (default: 8 €)
 * - showDetails    : print every sequence (default: false)
 *
 * Fixed: 1 € opening stake, 2.00× target, stake doubles after each loss.
 *
 * Sequence lifecycle:
 * 1. Observe without betting until `lossTrigger` consecutive losses appear.
 * 2. Stake 1 € on the next round.
 * 3. On a win, bank the sequence and return to observation.
 * 4. On a loss, double the stake, up to `maxBet`.
 * 5. On a loss at `maxBet`, abandon the sequence and return to observation.
 *
 * Runs on a virtual balance and restores the live game state when it finishes,
 * so calling it never disturbs the balance shown in the UI.
 */

async function testStrategy1(rounds = 1000, initialBalance = 1000.00, lossTrigger = 6, maxBet = 8.00, showDetails = false) {
    console.log(`\n========== STRATÉGIE TEST 1 ==========`);
    console.log(`Simulation de ${rounds} manches`);
    console.log(`Solde initial: ${initialBalance.toFixed(2)}€`);
    console.log(`Target: 2.00× | Déclencheur: ${lossTrigger} pertes consécutives`);
    console.log(`Mise max: ${maxBet.toFixed(2)}€ | Progression: Martingale\n`);

    // Snapshot the live game state so it can be restored on exit
    const savedState = saveState();
    const savedNonce = getNonce();

    // Strategy parameters and running totals
    const TARGET = 2.00;
    const LOSS_TRIGGER = lossTrigger;
    const INITIAL_BET = 1.00;
    const MAX_BET = maxBet;
    let virtualBalance = initialBalance;
    
    let currentBet = 0;
    let isWaitingMode = true;
    let consecutiveLosses = 0;
    let maxBetReached = 0;
    let totalBetsPlaced = 0;
    let totalWagered = 0;
    let totalWon = 0;
    let sequences = [];
    let currentSequence = null;
    let minBalanceReached = initialBalance;
    let sequencesAbandoned = 0; // Sequences dropped after losing at maxBet
    
    // Outcome counters
    let observedResults = 0;
    let winCount = 0;
    let lossCount = 0;
    
    const startTime = Date.now();
    let virtualNonce = savedNonce;

    for (let i = 0; i < rounds; i++) {
        const mult = await calculateMultiplier(virtualNonce);
        const isWin = mult >= TARGET;
        
        observedResults++;
        
        if (isWaitingMode) {
            // Observation mode: watch for the trigger streak, stake nothing
            if (isWin) {
                consecutiveLosses = 0;
            } else {
                consecutiveLosses++;
                
                if (consecutiveLosses >= LOSS_TRIGGER) {
                    isWaitingMode = false;
                    currentBet = INITIAL_BET;
                    currentSequence = {
                        startManche: i + 1,
                        triggerLosses: LOSS_TRIGGER,
                        bets: [],
                        totalWagered: 0,
                        totalWon: 0,
                        maxBet: 0,
                        abandonedAtMaxBet: false
                    };
                    if (showDetails) {
                        console.log(`🎯 Déclenchement à la manche ${i + 1} (${LOSS_TRIGGER} pertes consécutives détectées)`);
                    }
                }
            }
        } else {
            // Betting mode: a trigger streak has fired

            // The martingale can outrun the balance; stop before overdrawing
            if (currentBet > virtualBalance) {
                console.log(`\n💸 SOLDE INSUFFISANT !`);
                console.log(`   Mise requise: ${currentBet.toFixed(2)}€ | Solde disponible: ${virtualBalance.toFixed(2)}€`);
                console.log(`   Séquence interrompue par manque de fonds à la manche ${i + 1}`);
                
                currentSequence.endManche = i;
                currentSequence.success = false;
                currentSequence.profit = currentSequence.totalWon - currentSequence.totalWagered;
                sequences.push(currentSequence);
                currentSequence = null;
                
                break;
            }
            
            // Deduct the stake from the virtual balance
            virtualBalance -= currentBet;
            
            if (virtualBalance < minBalanceReached) {
                minBalanceReached = virtualBalance;
            }

            totalBetsPlaced++;
            totalWagered += currentBet;
            currentSequence.totalWagered += currentBet;
            currentSequence.bets.push({
                manche: i + 1,
                bet: currentBet,
                mult: mult,
                win: isWin
            });
            
            if (currentBet > maxBetReached) {
                maxBetReached = currentBet;
            }
            if (currentBet > currentSequence.maxBet) {
                currentSequence.maxBet = currentBet;
            }
            
            if (isWin) {
                // Win: the sequence closes in profit
                const winnings = currentBet * TARGET;
                virtualBalance += winnings;
                totalWon += winnings;
                currentSequence.totalWon += winnings;
                currentSequence.profit = currentSequence.totalWon - currentSequence.totalWagered;
                currentSequence.endManche = i + 1;
                currentSequence.success = true;
                
                winCount++;
                sequences.push(currentSequence);
                
                if (showDetails) {
                    console.log(`✅ Victoire à la manche ${i + 1} | Mise: ${currentBet.toFixed(2)}€ | Mult: ${mult.toFixed(2)}× | Gain: ${winnings.toFixed(2)}€`);
                    console.log(`   Séquence terminée | Profit: ${currentSequence.profit.toFixed(2)}€ | ${currentSequence.bets.length} paris\n`);
                }
                
                // Back to observation
                isWaitingMode = true;
                consecutiveLosses = 0;
                currentBet = 0;
                currentSequence = null;
            } else {
                // Loss
                lossCount++;
                
                // Losing at the cap ends the sequence at a loss
                if (currentBet >= MAX_BET) {
                    // Abandon the sequence
                    currentSequence.endManche = i + 1;
                    currentSequence.success = false;
                    currentSequence.profit = currentSequence.totalWon - currentSequence.totalWagered;
                    currentSequence.abandonedAtMaxBet = true;
                    sequences.push(currentSequence);
                    sequencesAbandoned++;
                    
                    if (showDetails) {
                        console.log(`⛔ Perte à mise max (${currentBet.toFixed(2)}€) à la manche ${i + 1} | Mult: ${mult.toFixed(2)}×`);
                        console.log(`   Séquence abandonnée | Perte: ${(-currentSequence.profit).toFixed(2)}€ | ${currentSequence.bets.length} paris\n`);
                    }
                    
                    // Back to observation
                    isWaitingMode = true;
                    consecutiveLosses = 0;
                    currentBet = 0;
                    currentSequence = null;
                } else {
                    // Double the stake, clamped to the cap
                    const nextBet = Math.min(currentBet * 2, MAX_BET);
                    
                    if (showDetails) {
                        console.log(`❌ Perte à la manche ${i + 1} | Mise: ${currentBet.toFixed(2)}€ | Mult: ${mult.toFixed(2)}×`);
                        console.log(`   Prochaine mise: ${nextBet.toFixed(2)}€${nextBet === MAX_BET ? ' (MAX)' : ''}\n`);
                    }
                    
                    currentBet = nextBet;
                }
            }
        }
        
        virtualNonce++;
    }
    
    // A sequence still open when the simulation ends is counted as unresolved
    if (currentSequence !== null) {
        currentSequence.endManche = rounds;
        currentSequence.success = false;
        currentSequence.profit = currentSequence.totalWon - currentSequence.totalWagered;
        sequences.push(currentSequence);
        if (showDetails) {
            console.log(`⚠️ Séquence inachevée à la fin de la simulation`);
        }
    }
    
    const elapsed = Date.now() - startTime;
    const netProfit = totalWon - totalWagered;
    
    // Report
    console.log(`\n========== RÉSULTATS FINAUX ==========`);
    console.log(`Temps d'exécution: ${elapsed}ms`);
    console.log(`\n--- Observations ---`);
    console.log(`Manches observées: ${observedResults}`);
    console.log(`Manches pariées: ${totalBetsPlaced}`);
    console.log(`\n--- Séquences ---`);
    console.log(`Nombre de séquences déclenchées: ${sequences.length}`);
    console.log(`Séquences gagnées: ${sequences.filter(s => s.success).length}`);
    console.log(`Séquences perdues/inachevées: ${sequences.filter(s => !s.success && !s.abandonedAtMaxBet).length}`);
    console.log(`Séquences abandonnées (max bet): ${sequencesAbandoned}`);
    
    if (sequences.length > 0) {
        const avgBetsPerSequence = sequences.reduce((sum, s) => sum + s.bets.length, 0) / sequences.length;
        const avgProfitPerSequence = sequences.reduce((sum, s) => sum + s.profit, 0) / sequences.length;
        const wonSequences = sequences.filter(s => s.success);
        const abandonedSequences = sequences.filter(s => s.abandonedAtMaxBet);
        
        console.log(`Paris moyens par séquence: ${avgBetsPerSequence.toFixed(2)}`);
        console.log(`Profit moyen par séquence: ${avgProfitPerSequence.toFixed(2)}€`);
        
        if (wonSequences.length > 0) {
            const avgProfitWon = wonSequences.reduce((sum, s) => sum + s.profit, 0) / wonSequences.length;
            console.log(`Profit moyen (séquences gagnées): ${avgProfitWon.toFixed(2)}€`);
        }
        
        if (abandonedSequences.length > 0) {
            const avgLossAbandoned = abandonedSequences.reduce((sum, s) => sum + s.profit, 0) / abandonedSequences.length;
            console.log(`Perte moyenne (séquences abandonnées): ${avgLossAbandoned.toFixed(2)}€`);
        }
    }
    
    console.log(`\n--- Mises ---`);
    console.log(`Mise maximale atteinte: ${maxBetReached.toFixed(2)}€`);
    console.log(`Total misé: ${totalWagered.toFixed(2)}€`);
    console.log(`Total gagné: ${totalWon.toFixed(2)}€`);
    console.log(`Profit net: ${netProfit.toFixed(2)}€`);
    console.log(`ROI: ${totalWagered > 0 ? ((netProfit / totalWagered) * 100).toFixed(2) : 0}%`);
    
    console.log(`\n--- Solde ---`);
    console.log(`Solde initial: ${initialBalance.toFixed(2)}€`);
    console.log(`Solde minimal atteint: ${minBalanceReached.toFixed(2)}€`);
    console.log(`Solde final: ${virtualBalance.toFixed(2)}€`);
    console.log(`Variation: ${(virtualBalance - initialBalance).toFixed(2)}€`);
    
    if (showDetails) {
        console.log(`\n--- Détail des séquences ---`);
        sequences.forEach((seq, idx) => {
            console.log(`Séquence #${idx + 1}:`);
            console.log(`  Manches: ${seq.startManche} à ${seq.endManche}`);
            console.log(`  Paris: ${seq.bets.length}`);
            console.log(`  Mise max: ${seq.maxBet.toFixed(2)}€`);
            console.log(`  Total misé: ${seq.totalWagered.toFixed(2)}€`);
            console.log(`  Total gagné: ${seq.totalWon.toFixed(2)}€`);
            console.log(`  Profit: ${seq.profit.toFixed(2)}€`);
            console.log(`  Statut: ${seq.success ? '✅ Gagnée' : seq.abandonedAtMaxBet ? '⛔ Abandonnée (max bet)' : '❌ Inachevée/Perdue'}\n`);
        });
    }
    
    console.log(`======================================\n`);
    
    // Restore the live game state
    restoreState(savedState);
    updateUI(savedState.history[0] || 0);
}

// Exposed for use from the browser console
window.testStrategy1 = testStrategy1;