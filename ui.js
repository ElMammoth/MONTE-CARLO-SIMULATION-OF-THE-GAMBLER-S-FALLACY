function updateUI(currentMult) {
    document.getElementById('mult').textContent = currentMult === 0 ? '-' : currentMult.toFixed(2) + '×';
    document.getElementById('balance').textContent = getBalance().toFixed(2);
    
    const stats = getStats();
    const target = getTargetFromInput();
    
    document.getElementById('wins').textContent = stats.wins;
    document.getElementById('losses').textContent = stats.losses;
    document.getElementById('winrate').textContent = stats.winrate.toFixed(2);
    
    const historyContainer = document.getElementById('history');
    historyContainer.innerHTML = '';
    stats.history.forEach(mult => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        // Ajouter la classe 'win' si le multiplicateur est >= à la cible
        if (mult >= target) {
            div.classList.add('win');
        }
        
        div.textContent = mult.toFixed(2) + '×';
        historyContainer.appendChild(div);
    });
}

function getTargetFromInput() {
    const value = parseFloat(document.getElementById('targetInput').value);
    return isNaN(value) || value < 1.00 ? 1.00 : Math.floor(value * 100) / 100;
}

function getBetAmountFromInput() {
    const value = parseFloat(document.getElementById('betInput').value);
    
    if (isNaN(value) || value < 0) {
        return 0;
    }
    
    const bet = Math.floor(value * 100) / 100;
    const currentBalance = getBalance();
    
    // Permet 0, sinon limite au solde disponible
    if (bet === 0) {
        return 0;
    }
    
    return Math.min(bet, currentBalance);
}

function setRunningUI(isRunning) {
    document.getElementById('targetInput').disabled = isRunning;
    document.getElementById('betInput').disabled = isRunning;
    document.getElementById('toggleBtn').textContent = isRunning ? 'Arrêter le Pari Automatique' : 'Lancer le Pari Automatiquement';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}