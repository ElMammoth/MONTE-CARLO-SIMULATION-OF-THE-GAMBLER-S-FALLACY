/**
 * Stratégie de test n°1 : Martingale après série de pertes avec limite de mise
 * 
 * Paramètres :
 * - nbLancees : Nombre de manches à simuler
 * - initialBalance : Solde de départ (défaut: 1000€)
 * - lossTrigger : Nombre de pertes consécutives avant de parier (défaut: 6)
 * - maxBet : Mise maximale autorisée (défaut: 8€)
 * - showDetails : Afficher le détail des séquences (défaut: false)
 * 
 * Paramètres fixes :
 * - Mise de départ : 1€
 * - Multiplicateur cible : 2.00×
 * - Progression : Martingale (doublement après chaque perte)
 * 
 * Logique :
 * 1. Observer sans parier jusqu'à détecter X pertes consécutives
 * 2. Parier 1€ à la manche suivante
 * 3. Si victoire : retour en mode observation
 * 4. Si perte : doubler la mise jusqu'à atteindre maxBet
 * 5. Si perte à maxBet : abandonner la séquence et retourner en observation
 */

async function testStrategie1(nbLancees = 1000, initialBalance = 1000.00, lossTrigger = 6, maxBet = 8.00, showDetails = false) {
    console.log(`\n========== STRATÉGIE TEST 1 ==========`);
    console.log(`Simulation de ${nbLancees} manches`);
    console.log(`Solde initial: ${initialBalance.toFixed(2)}€`);
    console.log(`Target: 2.00× | Déclencheur: ${lossTrigger} pertes consécutives`);
    console.log(`Mise max: ${maxBet.toFixed(2)}€ | Progression: Martingale\n`);

    // Sauvegarder l'état actuel du jeu
    const savedState = saveState();
    const savedNonce = getNonce();

    // Variables de la stratégie
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
    let sequencesAbandoned = 0; // Compteur de séquences abandonnées à cause de maxBet
    
    // Statistiques de résultats
    let observedResults = 0;
    let winCount = 0;
    let lossCount = 0;
    
    const startTime = Date.now();
    let virtualNonce = savedNonce;

    for (let i = 0; i < nbLancees; i++) {
        const mult = await calculateMultiplier(virtualNonce);
        const isWin = mult >= TARGET;
        
        observedResults++;
        
        if (isWaitingMode) {
            // Mode observation
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
            // Mode pari actif

            // VÉRIFICATION DU SOLDE AVANT DE PARIER
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
            
            // Déduire la mise du solde virtuel
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
                // Victoire
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
                
                // Reset
                isWaitingMode = true;
                consecutiveLosses = 0;
                currentBet = 0;
                currentSequence = null;
            } else {
                // Perte
                lossCount++;
                
                // Vérifier si on a atteint la mise maximale
                if (currentBet >= MAX_BET) {
                    // Abandonner la séquence
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
                    
                    // Retour en mode observation
                    isWaitingMode = true;
                    consecutiveLosses = 0;
                    currentBet = 0;
                    currentSequence = null;
                } else {
                    // Doubler la mise (en respectant la limite)
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
    
    // Si une séquence est toujours en cours à la fin
    if (currentSequence !== null) {
        currentSequence.endManche = nbLancees;
        currentSequence.success = false;
        currentSequence.profit = currentSequence.totalWon - currentSequence.totalWagered;
        sequences.push(currentSequence);
        if (showDetails) {
            console.log(`⚠️ Séquence inachevée à la fin de la simulation`);
        }
    }
    
    const elapsed = Date.now() - startTime;
    const netProfit = totalWon - totalWagered;
    
    // Affichage des résultats
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
    
    // Restaurer l'état du jeu
    restoreState(savedState);
    updateUI(savedState.history[0] || 0);
}

// Exposer la fonction globalement
window.testStrategie1 = testStrategie1;