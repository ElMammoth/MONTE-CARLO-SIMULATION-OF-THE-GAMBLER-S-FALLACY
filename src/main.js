/**
 * Bootstrap. Loaded last, at the end of <body>, so the DOM is ready.
 *
 * Generates a fresh seed pair for the session, resets the balance, wires the
 * autoplay button, and exposes the two console entry points.
 */

const { serverSeed, clientSeed } = initializeSeeds();
setSeeds(serverSeed, clientSeed);

resetBalance();
updateUI(0);

console.log('Seeds générées:');
console.log('Server Seed:', serverSeed);
console.log('Client Seed:', clientSeed);
console.log('Solde initial:', getBalance());

document.getElementById('toggleBtn').addEventListener('click', toggle);

// Console entry points
window.TEST = runTest;

console.log('\n📊 Fonctions disponibles:');
console.log('  TEST(n, target, betAmount)');
console.log('    * n          : nombre de manches (défaut: 100000)');
console.log('    * target     : multiplicateur cible (défaut: 2.00)');
console.log('    * betAmount  : mise par manche (défaut: 1.00)');
console.log('  testStrategy1(rounds, initialBalance, lossTrigger, maxBet, showDetails)');
console.log('    * rounds         : nombre de manches (défaut: 1000)');
console.log('    * initialBalance : solde de départ (défaut: 1000€)');
console.log('    * lossTrigger    : pertes consécutives déclencheur (défaut: 6)');
console.log('    * maxBet         : mise maximale (défaut: 8€)');
console.log('    * showDetails    : afficher détails (défaut: false)');
console.log('\nExemples:');
console.log('  TEST(100000)                        - 100k manches, target 2.00×, mise 1€');
console.log('  testStrategy1(10000)                - 10k manches, 1000€, trigger 6, max 8€');
console.log('  testStrategy1(5000, 500)            - 5k manches, 500€');
console.log('  testStrategy1(1000, 1000, 8)        - 1k manches, trigger 8');
console.log('  testStrategy1(1000, 1000, 6, 64)    - plafond de mise à 64€');
console.log('  testStrategy1(1000, 1000, 6, 8, true) - avec détails complets');
