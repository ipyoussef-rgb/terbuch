/**
 * Pay-API transactionTimeout we send (max 60 per KOBIL).
 * Plus a small grace window before we declare TIMEOUT client-side.
 */
export const PAY_TRANSACTION_TIMEOUT_SEC = 60;
export const PAY_DEADLINE_GRACE_SEC = 10;
export const PAY_DEADLINE_MS =
  (PAY_TRANSACTION_TIMEOUT_SEC + PAY_DEADLINE_GRACE_SEC) * 1000;
