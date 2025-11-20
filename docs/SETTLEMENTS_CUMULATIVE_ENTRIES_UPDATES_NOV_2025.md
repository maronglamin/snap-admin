## Cumulative Entries Report — November 2025 Update

Audience: Business and Engineering

### What changed (high level)
- Credits now include only successful customer payments from the payment gateway.
- Debits now include settlement requests and gateway fees.
- Service fees are excluded from totals and shown only via a “Closing Balance (Service − Gateway)”. 
- Orders are no longer included in totals; they remain in the report for reference/details only.

### Why it changed
- Aligns the report with actual cash movements: 
  - Money in from customers (Original, SUCCESS) → Credits
  - Money out to processors (Gateway fees) and to sellers (Settlement requests) → Debits
- Separates platform revenue (service fees) from operational cash movement by presenting it as a closing balance (informational) rather than part of credits.

### Data classification (effective now)
- Settlements (`settlement`) → Debit
- Orders (`orders`) → Details only (not in totals)
- External Transactions (`external_transaction`, SUCCESS only):
  - `ORIGINAL` → Credit (Customer Payments)
  - `FEE` → Debit (Gateway Fee)
  - `SERVICE_FEE` → Excluded from totals (used only in Closing Balance)

### Calculation formulas
- Debits = Settlement Requests + Gateway Fees
- Credits = Customer Payments (ORIGINAL, SUCCESS only)
- Net Position = Debits − Credits
- Closing Balance (display only) = Service Fees − Gateway Fees

### API behavior
- Endpoint: `/api/settlements/cumulative-entries`
- External transactions filtered by `status = SUCCESS`
- Per-currency payload now resembles:

```
{
  "currency": "USD",
  "debits": {
    "settlementRequests": number,
    "gatewayFee": number
  },
  "credits": {
    "customerPayments": number
  },
  "closingBalance": number, // serviceFee - gatewayFee
  "totalDebits": number,
  "totalCredits": number,
  "netPosition": number,
  "details": {
    "settlements": [...],
    "orders": [...],                 // reference only
    "externalTransactions": [...]
  }
}
```

### UI/Report changes
- Debit section shows:
  - Settlement Requests
  - Gateway Fee
- Credit section shows:
  - Customer Payments
- The “Closing Balance (Service − Gateway)” appears after totals; it’s informative and not part of totals.

### Examples
- Single order $100 (SUCCESS):
  - Debits: $2.90 Gateway Fee + $92.10 Settlement Requests = $95.00
  - Credits: $100 Customer Payments
  - Net Position = $95.00 − $100.00 = −$5.00
  - Closing Balance = $5.00 Service Fee − $2.90 Gateway Fee = $2.10

### Migration/compatibility notes
- No schema changes.
- Existing consumers of the endpoint should note:
  - Removal of prior order-based debit components from totals.
  - `debits.gatewayFee` replaces any previous fee subtotal usage.
  - Service fee no longer appears in credits; use `closingBalance` for visibility.

### Owner and rollback
- Owner: Settlements & Reporting
- Rollback plan: Revert to previous classification in `backend/src/routes/settlements.ts` and restore prior UI labels if business requests re-inclusion of service fees in credits and orders in totals.

