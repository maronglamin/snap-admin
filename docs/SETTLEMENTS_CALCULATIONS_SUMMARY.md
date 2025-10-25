# Settlements Cumulative Entries - Quick Reference Guide

## 🎯 Purpose
The cumulative entries report provides a complete financial overview of the platform by consolidating all transactions into debits and credits, grouped by currency.

## 📊 Data Sources & Classification

| Source | Table | Classification | Description |
|--------|-------|----------------|-------------|
| **Settlements** | `settlement` | **DEBIT** | Money requested by sellers for withdrawal |
| **Orders** | `order` | **DEBIT** | Customer payments and order amounts |
| **External Transactions** | `external_transaction` | **MIXED** | Payment processing and fees |

## 💰 Transaction Types (External Transactions)

| Type | Classification | Description | Example |
|------|----------------|-------------|---------|
| `ORIGINAL` | **DEBIT** | Customer payment amount | $100 order payment |
| `FEE` | **CREDIT** | Payment gateway fees | Stripe processing fee |
| `SERVICE_FEE` | **CREDIT** | Platform revenue | 5% service fee |

## 🧮 Calculation Formula

### Debits (Money In)
```
Total Debits = Settlement Requests + Discounts + Tax + Shipping + 
               Total Order Amounts + Original Payments
```

### Credits (Money Out)
```
Total Credits = Service Fees + Gateway Fees
```

### Net Position
```
Net Position = Total Debits - Total Credits
```

## 📈 Business Logic Examples

### Example 1: Single Order Flow
```
Customer Order: $100
├── Debit: Original Payment = $100
├── Credit: Gateway Fee = $2.90
├── Credit: Service Fee = $5.00
└── Debit: Settlement Request = $92.10

Net Position: $100 - $2.90 - $5.00 = $92.10 ✅
```

### Example 2: Platform Revenue
```
10 Orders × $100 = $1,000
├── Gateway Fees: $29.00
├── Service Fees: $50.00
└── Net Revenue: $921.00

Platform Revenue = Service Fees = $50.00 💰
```

## 🔍 Key Metrics

### Positive Net Position
- **Meaning**: Platform has positive cash flow
- **Action**: Money available for operations

### Negative Net Position
- **Meaning**: Platform has negative cash flow
- **Action**: Requires investigation

### Service Fees
- **Purpose**: Primary platform revenue
- **Calculation**: Percentage of order amounts

### Gateway Fees
- **Purpose**: Payment processor costs
- **Impact**: Reduces net revenue

## 📅 Filtering Options

- **Date Range**: `dateFrom` & `dateTo` parameters
- **Currency**: Specific currency filtering
- **Real-time**: Current database state

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
