# Settlements Cumulative Entries - Quick Reference Guide

## 🎯 Purpose
The cumulative entries report provides a complete financial overview of the platform by consolidating all transactions into debits and credits, grouped by currency.

## 📊 Data Sources & Classification

| Source | Table | Classification | Description |
|--------|-------|----------------|-------------|
| **Settlements** | `settlement` | **DEBIT** | Money requested by sellers for withdrawal |
| **Orders** | `order` | **DETAILS ONLY** | Shown for reference; not included in totals |
| **External Transactions** | `external_transaction` | **MIXED** | Payment processing and fees (SUCCESS only) |

## 💰 Transaction Types (External Transactions)

| Type | Classification | Description | Example |
|------|----------------|-------------|---------|
| `ORIGINAL` | **CREDIT** | Customer payment amount (SUCCESS only) | $100 order payment |
| `FEE` | **DEBIT** | Payment gateway fees | Stripe processing fee |
| `SERVICE_FEE` | — (excluded from totals) | Used only for closing balance | 5% service fee |

## 🧮 Calculation Formula

### Debits
```
Total Debits = Settlement Requests + Gateway Fees
```

### Credits
```
Total Credits = Customer Payments (ORIGINAL, SUCCESS only)
```

### Net Position
```
Net Position = Total Debits - Total Credits
```

### Closing Balance (Displayed only)
```
Closing Balance = Service Fees - Gateway Fees
```

## 📈 Business Logic Examples

### Example 1: Single Order Flow
```
Customer Order: $100
├── Credit: Customer Payment (ORIGINAL, SUCCESS) = $100
├── Debit: Gateway Fee (FEE) = $2.90
├── Closing Balance Component: Service Fee (SERVICE_FEE) = $5.00
└── Debit: Settlement Request = $92.10

Totals:
Debits = $2.90 + $92.10 = $95.00
Credits = $100.00
Net Position = $95.00 - $100.00 = -$5.00
Closing Balance (Service - Gateway) = $5.00 - $2.90 = $2.10 ✅
```

### Example 2: Platform Revenue
```
10 Orders × $100 = $1,000
├── Debits: Gateway Fees = $29.00
├── Credits: Customer Payments = $1,000.00
├── Debits: Settlement Requests = $921.00
└── Closing Balance: Service Fees - Gateway Fees = $50.00 - $29.00 = $21.00

Net Position = ($29.00 + $921.00) - $1,000.00 = -$50.00
Closing Balance = $21.00 💰
```

## 🔍 Key Metrics

### Positive Net Position
- **Meaning**: Platform has positive cash flow
- **Action**: Money available for operations

### Negative Net Position
- **Meaning**: Platform has negative cash flow
- **Action**: Requires investigation

### Service Fees
- **Purpose**: Platform revenue (used for closing balance; excluded from totals)
- **Calculation**: Percentage of order amounts (recorded as `SERVICE_FEE`)

### Gateway Fees
- **Purpose**: Payment processor costs
- **Impact**: Debited to platform; reduces net position

## 📅 Filtering Options

- **Date Range**: `dateFrom` & `dateTo` parameters
- **Currency**: Specific currency filtering
- **Real-time**: Current database state
- **Success Filter**: External transactions must have `status = SUCCESS`

## 🎯 Use Cases

1. **Financial Reporting**: Monthly/quarterly statements
2. **Revenue Analysis**: Track platform performance
3. **Cash Flow Management**: Monitor liquidity
4. **Compliance**: Audit trails and regulatory reporting

## ⚠️ Important Considerations

- **Currency Isolation**: No cross-currency conversions
- **Real-time Data**: Reflects current database state
- **Settlement Timing**: Requests may not be immediately processed
- **Data Integrity**: Relies on accurate transaction recording
