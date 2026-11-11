// ─────────────────────────────────────────────────────────────────────────────
// RATIO metrics — computed on the client from the mart's TOTALS (docs/SCHEMA.md §4.2). The mart deliberately does not
// carry ratios: "all plans" = sum of the plans, and summing ratios is wrong.
//
// Rule: denominator = 0 (or missing) ⇒ `null`, NOT 0. `0` reads as "equals zero", which is wrong;
// the display shows a dash.
// ─────────────────────────────────────────────────────────────────────────────

export function ratio(num: number | null | undefined, den: number | null | undefined): number | null {
  if (num == null || den == null || !Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}

/** Sum the numeric columns of several rows (used to roll plans up into "all plans"). */
export function sumBy<T>(rows: readonly T[], pick: (r: T) => number): number {
  let s = 0;
  for (const r of rows) s += pick(r);
  return s;
}

/** ARPA = end-of-period MRR ÷ number of paying companies. */
export const arpa = (mrrEnd: number, payingCompanies: number) => ratio(mrrEnd, payingCompanies);

/** Gross MRR churn = lost MRR (churn + contraction, negative in the mart) ÷ START-of-period MRR. Returns a positive number. */
export function grossMrrChurn(churnedMrr: number, contractionMrr: number, mrrStart: number): number | null {
  return ratio(-(churnedMrr + contractionMrr), mrrStart);
}

/**
 * NRR = (start-of-period MRR + expansion + contraction + churn + plan changes in/out) ÷ start-of-period MRR.
 * EXISTING customers only: excludes new + reactivation. Meaningful at the ALL PLANS level — per plan, a plan change makes
 * the customer "leave" that plan.
 */
export function nrr(m: {
  mrrStart: number;
  expansion: number;
  contraction: number;
  churned: number;
  planIn: number;
  planOut: number;
}): number | null {
  return ratio(m.mrrStart + m.expansion + m.contraction + m.churned + m.planIn + m.planOut, m.mrrStart);
}

/** Logo churn = churned companies ÷ paying companies at the START of the period. */
export const logoChurn = (churnedCompanies: number, payingStart: number) => ratio(churnedCompanies, payingStart);

/** Average DAU = total person-days ÷ days in the period (running month: up to the cut-off date). */
export const dauAvg = (activeUserDays: number, daysInPeriod: number) => ratio(activeUserDays, daysInPeriod);

/** Stickiness = average DAU ÷ MAU. */
export function stickiness(activeUserDays: number, daysInPeriod: number, mau: number): number | null {
  const dau = dauAvg(activeUserDays, daysInPeriod);
  return dau == null ? null : ratio(dau, mau);
}

/** Seat usage rate = MAU ÷ number of users (seats) at period end. */
export const seatUsage = (mau: number, seatUsersEnd: number) => ratio(mau, seatUsersEnd);

/** Collection rate = paid ÷ invoiced. */
export const collectionRate = (paid: number, invoiced: number) => ratio(paid, invoiced);

/** Change vs the previous period = (now − previous) ÷ |previous|. */
export function deltaRate(now: number | null, before: number | null): number | null {
  if (now == null || before == null) return null;
  return ratio(now - before, Math.abs(before));
}
