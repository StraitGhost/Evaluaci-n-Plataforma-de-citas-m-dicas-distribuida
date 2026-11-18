export function contarPrimos(n: number): number {
    if (n <= 2) return 0;
    let total = 1; // el 2
    for (let i = 3; i < n; i += 2) {
        let esPrimo = true;
        for (let d = 3; d * d <= i; d += 2) {
            if (i % d === 0) { esPrimo = false; break; }
        }
        if (esPrimo) total++;
    }
    return total;
}
