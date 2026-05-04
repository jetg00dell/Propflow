/**
 * Calculates the estimated current mortgage balance using standard amortization math.
 * Starts from a known balance on a known date and runs the formula forward month by month to today.
 */
export function calculateCurrentBalance(
  confirmedBalance: number,
  annualRate: number,
  monthlyPayment: number,
  balanceDate: string | null
): number {
  if (!balanceDate || !confirmedBalance || !annualRate || !monthlyPayment) {
    return confirmedBalance
  }

  const monthlyRate = annualRate / 100 / 12

  // Calculate how many full months have passed since the confirmed balance date
  const confirmed = new Date(balanceDate)
  const today = new Date()

  const monthsElapsed =
    (today.getFullYear() - confirmed.getFullYear()) * 12 +
    (today.getMonth() - confirmed.getMonth())

  if (monthsElapsed <= 0) return confirmedBalance

  let balance = confirmedBalance
  for (let i = 0; i < monthsElapsed; i++) {
    const interestPortion = balance * monthlyRate
    const principalPortion = monthlyPayment - interestPortion
    balance = balance - principalPortion
    if (balance <= 0) return 0
  }

  return Math.round(balance)
}
