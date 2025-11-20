# Settlements Cumulative Entries - Financial Calculations Documentation

## Overview
The `/api/settlements/cumulative-entries` endpoint generates a comprehensive financial report that consolidates all financial transactions across the platform, grouped by currency. This report provides a complete view of the platform's financial position by categorizing transactions into debits and credits.

## Data Sources

### 1. Settlements Table
- **Purpose**: Records settlement requests made by sellers to withdraw their earnings
- **Key Fields**: `amount`, `currency`, `createdAt`, `userId`
- **Classification**: **DEBIT** (Money flowing out of the platform)

### 2. Orders Table
- **Purpose**: Records all customer orders and their financial components
- **Key Fields**: `discountAmount`, `taxAmount`, `shippingAmount`, `totalAmount`, `currencyCode`, `createdAt`
- **Classification**: **DETAILS ONLY** (Not included in debit/credit totals; shown for reference)

### 3. External Transactions Table
- **Purpose**: Records all payment gateway transactions and fees
- **Key Fields**: `amount`, `currencyCode`, `transactionType`, `createdAt`
- **Classification**: **MIXED** (Based on transaction type)

## Transaction Type Classification

### External Transaction Types

#### 1. ORIGINAL Transactions
- **Description**: The actual customer payment amount
- **Classification**: **CREDIT** (Successful customer payments credited to platform)
- **Example**: Customer pays $100 for an order

#### 2. FEE Transactions
- **Description**: Payment gateway processing fees (e.g., Stripe fees)
- **Classification**: **DEBIT** (Costs paid to payment processors)
- **Example**: Stripe charges $2.90 + 2.9% = $5.80 fee

#### 3. SERVICE_FEE Transactions
- **Description**: Platform service fees charged to sellers
- **Classification**: **EXCLUDED FROM TOTALS** (Tracked only for closing balance; not shown as a separate credit line)
- **Example**: 5% service fee on $100 order = $5.00

## Calculation Logic

### Step 1: Data Retrieval
```typescript
// Filter by date range and currency (if specified)
const dateFilter = {
  gte: new Date(dateFrom), // From date
  lte: new Date(dateTo)    // To date
};

// Fetch all relevant data
const settlements = await prisma.settlement.findMany({...});
const orders = await prisma.order.findMany({...});
const externalTransactions = await prisma.externalTransaction.findMany({
  where: {
    status: 'SUCCESS', // Only successful transactions are included in totals
    // ... plus date and currency filters
  }
});
```

### Step 2: Currency Grouping
All transactions are grouped by currency (USD, EUR, etc.) to provide separate financial positions for each currency.

### Step 3: Debit Calculations

#### Settlement Requests
```typescript
debits.settlementRequests += Number(settlement.amount);
```
- **Source**: Settlement table
- **Logic**: Sum of all settlement request amounts
- **Purpose**: Money requested by sellers for withdrawal

#### Gateway Fees
```typescript
if (transaction.transactionType === 'FEE') {
  debits.gatewayFee += Number(transaction.amount);
}
```
- **Source**: External transactions (SUCCESS only)
- **Logic**: Sum of all payment gateway fees
- **Purpose**: Processor costs debited to the platform

### Step 4: Credit Calculations

#### Customer Payments (Original)
```typescript
if (transaction.transactionType === 'ORIGINAL') {
  credits.customerPayments += Number(transaction.amount);
}
```
- **Source**: External transactions (SUCCESS only)
- **Logic**: Sum of all original payment amounts
- **Purpose**: Total successful customer payments credited to the platform

### Step 5: Closing Balance

The closing balance provides the difference between platform service fees and gateway fees. It is displayed for reference and not included in debit/credit totals.

```typescript
closingBalance = serviceFee - gatewayFee
```
- **Service Fee Source**: External transactions with `transactionType === 'SERVICE_FEE'` (tracked only for closing balance)
- **Gateway Fee Source**: External transactions with `transactionType === 'FEE'`

### Step 6: Net Position Calculation

#### Total Debits
```typescript
totalDebits = settlementRequests + gatewayFee;
```

#### Total Credits
```typescript
totalCredits = customerPayments;
```

#### Net Position
```typescript
netPosition = totalDebits - totalCredits;
```

## Financial Interpretation

### Positive Net Position
- **Meaning**: Platform has more money coming in than going out
- **Example**: Net Position = $10,000 means platform has $10,000 in positive cash flow

### Negative Net Position
- **Meaning**: Platform has more money going out than coming in
- **Example**: Net Position = -$5,000 means platform has $5,000 in negative cash flow

## Report Structure

### Per Currency Group
```json
{
  "currency": "USD",
  "debits": {
    "settlementRequests": 5000.00,
    "gatewayFee": 435.00
  },
  "credits": {
    "customerPayments": 15000.00
  },
  "closingBalance": 315.00, // serviceFee - gatewayFee (not included in totals)
  "totalDebits": 5435.00,
  "totalCredits": 15000.00,
  "netPosition": -955? // Example; sign indicates DR - CR
}
```

### Summary Totals
```json
{
  "summary": {
    "totalCurrencies": 2,
    "totalDebits": 50000.00,
    "totalCredits": 2000.00,
    "netPosition": 48000.00,
    "closingBalance": 1500.00
  }
}
```

## Business Logic Examples

### Example 1: Simple Order Flow
1. **Customer pays $100 (SUCCESS)**
   - Credit: `customerPayments` = $100 (ORIGINAL)
2. **Processor charges fee**
   - Debit: `gatewayFee` = $2.90 (FEE)
3. **Platform records service fee (for closing balance only)**
   - Closing Balance component: `serviceFee` = $5.00 (SERVICE_FEE)
4. **Seller requests settlement**
   - Debit: `settlementRequests` = $92.10

Totals in report:
- Debits: $2.90 (gatewayFee) + $92.10 (settlementRequests) = $95.00
- Credits: $100.00 (customerPayments)
- Net Position (DR - CR) = $95.00 - $100.00 = -$5.00
- Closing Balance (Service - Gateway) = $5.00 - $2.90 = $2.10

### Example 2: Multiple Orders
- 10 orders of $100 each = $1,000 total
- Gateway fees (debit): $29.00
- Service fees (closing balance only): $50.00
- Settlement requests (debit): $921.00

Report totals:
- Debits: $29.00 + $921.00 = $950.00
- Credits: $1,000.00
- Net Position: $950.00 - $1,000.00 = -$50.00
- Closing Balance: $50.00 - $29.00 = $21.00

## Filtering Options

### Date Range Filtering
- **dateFrom**: Start date for transactions
- **dateTo**: End date for transactions
- **Purpose**: Generate reports for specific time periods

### Currency Filtering
- **currency**: Specific currency code (USD, EUR, etc.)
- **Purpose**: Focus on specific currency performance

## Use Cases

### 1. Financial Reporting
- Monthly/quarterly financial statements
- Revenue analysis and forecasting
- Cash flow management

### 2. Platform Performance
- Track platform revenue (service fees)
- Monitor payment processor costs
- Analyze settlement patterns

### 3. Currency Management
- Multi-currency financial positions
- Currency-specific risk assessment
- Exchange rate impact analysis

### 4. Compliance & Auditing
- Financial transaction audit trails
- Regulatory reporting requirements
- Internal financial controls

## Important Notes

### 1. Real-time vs. Historical
- Report reflects actual database state
- May not include pending transactions
- Settlement requests may not be immediately processed

### 2. Currency Considerations
- All calculations are per currency
- No cross-currency conversions
- Exchange rate fluctuations not accounted for

### 3. Data Integrity
- Relies on accurate transaction recording
- Requires proper transaction type classification
- Settlement amounts should match calculated payouts

### 4. Performance Considerations
- Large date ranges may impact performance
- Consider implementing pagination for large datasets
- Database indexes on date and currency fields recommended
