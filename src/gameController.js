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
