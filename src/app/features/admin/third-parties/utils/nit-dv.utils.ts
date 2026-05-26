/**
 * Calcula el dígito de verificación (DV) de un NIT colombiano.
 * Algoritmo oficial DIAN — pesos: [3,7,13,17,19,23,29,37,41,43,47,53,59,67,71]
 */
export function calculateNitDv(nit: string): string {
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const digits  = nit.replace(/\D/g, '');
  if (!digits) return '';
  let sum = 0;
  for (let i = digits.length - 1, wi = 0; i >= 0; i--, wi++) {
    sum += parseInt(digits[i]) * weights[wi % weights.length];
  }
  const rem = sum % 11;
  return (rem <= 1 ? rem : 11 - rem).toString();
}
