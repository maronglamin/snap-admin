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
- **Classification**: **DEBIT** (Customer payments and order-related amounts)

### 3. External Transactions Table
- **Purpose**: Records all payment gateway transactions and fees
- **Key Fields**: `amount`, `currencyCode`, `transactionType`, `createdAt`
- **Classification**: **MIXED** (Based on transaction type)

## Transaction Type Classification

### External Transaction Types

#### 1. ORIGINAL Transactions
- **Description**: The actual customer payment amount
- **Classification**: **DEBIT** (Money coming into the platform)
- **Example**: Customer pays $100 for an order

#### 2. FEE Transactions
- **Description**: Payment gateway processing fees (e.g., Stripe fees)
- **Classification**: **CREDIT** (Money flowing out to payment processors)
- **Example**: Stripe charges $2.90 + 2.9% = $5.80 fee

#### 3. SERVICE_FEE Transactions
- **Description**: Platform service fees charged to sellers
- **Classification**: **CREDIT** (Platform revenue)
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
const externalTransactions = await prisma.externalTransaction.findMany({...});
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

#### Order-Related Debits
```typescript
debits.discounts += Number(order.discountAmount);
debits.tax += Number(order.taxAmount);
debits.shippingAmount += Number(order.shippingAmount);
debits.totalAmount += Number(order.totalAmount);
```
- **Source**: Orders table
- **Logic**: Sum of order financial components
- **Purpose**: Customer payments and order costs

#### Original Transaction Amounts
```typescript
if (transaction.transactionType === 'ORIGINAL') {
  debits.original += Number(transaction.amount);
}
```
- **Source**: External transactions table
- **Logic**: Sum of all original payment amounts
- **Purpose**: Total customer payments processed

### Step 4: Credit Calculations

#### Gateway Fees
```typescript
if (transaction.transactionType === 'FEE') {
  credits.gatewayFee += Number(transaction.amount);
}
```
- **Source**: External transactions table
- **Logic**: Sum of all payment gateway fees
- **Purpose**: Fees paid to payment processors (Stripe, etc.)

#### Service Fees
```typescript
if (transaction.transactionType === 'SERVICE_FEE') {
  credits.serviceFee += Number(transaction.amount);
}
```
- **Source**: External transactions table
- **Logic**: Sum of all platform service fees
- **Purpose**: Platform revenue from seller transactions

### Step 5: Net Position Calculation

#### Total Debits
```typescript
totalDebits = settlementRequests + discounts + tax + shippingAmount + 
              totalAmount + fee + original;
```

#### Total Credits
```typescript
totalCredits = serviceFee + gatewayFee;
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
    "settlementRequests": 5000.00,    // Money requested by sellers
    "discounts": 150.00,              // Customer discounts given
    "tax": 300.00,                    // Tax collected
    "shippingAmount": 200.00,         // Shipping fees
    "totalAmount": 15000.00,          // Total order amounts
    "fee": 0.00,                      // Additional fees
    "original": 15000.00              // Original payment amounts
  },
  "credits": {
    "serviceFee": 750.00,             // Platform revenue
    "gatewayFee": 435.00              // Payment processor fees
  },
  "totalDebits": 30650.00,
  "totalCredits": 1185.00,
  "netPosition": 29465.00
}
```

### Summary Totals
```json
{
  "summary": {
    "totalCurrencies": 2,
    "totalDebits": 50000.00,
    "totalCredits": 2000.00,
    "netPosition": 48000.00
  }
}
```

## Business Logic Examples

### Example 1: Simple Order Flow
1. **Customer places $100 order**
   - Debit: `totalAmount` = $100
   - Debit: `original` = $100

2. **Payment processing**
   - Credit: `gatewayFee` = $2.90 (Stripe fee)
   - Credit: `serviceFee` = $5.00 (5% platform fee)

3. **Seller requests settlement**
   - Debit: `settlementRequests` = $92.10 (100 - 2.90 - 5.00)

**Net Position**: $100 - $2.90 - $5.00 = $92.10 (positive)

### Example 2: Multiple Orders
- 10 orders of $100 each = $1,000 total
- Gateway fees: $29.00
- Service fees: $50.00
- Settlement requests: $921.00

**Net Position**: $1,000 - $29.00 - $50.00 = $921.00

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
