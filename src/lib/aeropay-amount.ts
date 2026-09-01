/**
 * AeroPay v2 uses integer pennies in API payloads; this app collects and
 * displays USD dollars in the UI. These helpers convert at that boundary only.
 *
 * Example: user enters $5.00 → send `500` to AeroPay → show `$5.00` again in UI.
 *
 * @see https://dev.aero.inc/changelog/2025-11-14-release-notes-v2-api
 */

/** UI dollars → integer pennies for AeroPay request bodies (e.g. $5.00 → 500). */
export function dollarsToPennies(dollars: number): number {
  return Math.round(dollars * 100);
}

/** AeroPay response pennies → UI dollars (e.g. 500 → 5). */
export function penniesToDollars(pennies: number): number {
  return Math.round(pennies) / 100;
}
