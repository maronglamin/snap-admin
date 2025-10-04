'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiService } from '@/services/api';

interface FinancialEntry {
  currency: string;
  debits: {
    settlementRequests: number;
    original: number;
  };
  credits: {
    serviceFee: number;
    gatewayFee: number;
  };
  totalDebits: number;
  totalCredits: number;
  netPosition: number;
  details: {
    settlements: any[];
    orders: any[];
    externalTransactions: any[];
  };
}

interface FinancialSummary {
  totalCurrencies: number;
  totalDebits: number;
  totalCredits: number;
  netPosition: number;
}

export default function CumulativeEntriesPage() {
  const [financialData, setFinancialData] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return startOfMonth.toISOString().slice(0, 16);
  });
  const [dateTo, setDateTo] = useState(() => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
    return endOfDay.toISOString().slice(0, 16);
  });
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [expandedCurrencies, setExpandedCurrencies] = useState<string[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Load financial data only when search is triggered
  const loadFinancialData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (filterCurrency !== 'all') params.currency = filterCurrency;

      await loadFinancialDataWithParams(params);
    } catch (err: any) {
      setError(err.message || 'Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFinancialDataWithParams = async (params: any) => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('Loading financial data with params:', params);

      const response = await apiService.getCumulativeEntries(params);
      
      if (response.success) {
        setFinancialData(response.data);
        setSummary((response as any).summary);
        setHasSearched(true);
        console.log('Financial data loaded:', response.data);
      } else {
        setError((response as any).error || 'Failed to load financial data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCurrencyExpansion = (currency: string) => {
    setExpandedCurrencies(prev => 
      prev.includes(currency) 
        ? prev.filter(c => c !== currency)
        : [...prev, currency]
    );
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Utility function to format numbers with thousand separators for exports
  const formatNumberWithSeparators = (number: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  // Helper function to create properly formatted CSV rows
  const createCSVRow = (col1: string, col2: string = '', col3: string = '') => {
    return `"${col1}","${col2}","${col3}"\n`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNetPositionColor = (netPosition: number) => {
    if (netPosition > 0) return 'text-red-600';
    if (netPosition < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getNetPositionIcon = (netPosition: number) => {
    if (netPosition > 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    if (netPosition < 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <Calculator className="h-4 w-4 text-gray-600" />;
  };

  // Helper function to format large numbers with abbreviations
  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  const exportToCSV = () => {
    if (!financialData.length) return;
    
    let csvContent = '';
    
    financialData.forEach((entry, index) => {
      // Add currency header
      csvContent += `"Financial Statement - ${entry.currency.toUpperCase()}"\n`;
      csvContent += `"As of ${new Date().toLocaleDateString()}"\n`;
      csvContent += '\n';
      
      // Table headers
      csvContent += createCSVRow('Account', 'Debit (DR)', 'Credit (CR)');
      
      // Debit entries section
      csvContent += createCSVRow('DEBIT ENTRIES');
      csvContent += createCSVRow('Settlement Requests', formatNumberWithSeparators(entry.debits.settlementRequests));
      csvContent += createCSVRow('Customer payments and order costs', formatNumberWithSeparators(entry.debits.original));
      
      // Credit entries section
      csvContent += createCSVRow('CREDIT ENTRIES');
      csvContent += createCSVRow('Service Fees', '', formatNumberWithSeparators(entry.credits.serviceFee));
      csvContent += createCSVRow('Gateway Fees', '', formatNumberWithSeparators(entry.credits.gatewayFee));
      csvContent += createCSVRow('Subtotal (Service - Gateway)', '', formatNumberWithSeparators(entry.credits.serviceFee - entry.credits.gatewayFee));
      
      // Totals
      csvContent += createCSVRow('TOTALS', formatNumberWithSeparators(entry.totalDebits), formatNumberWithSeparators(entry.totalCredits));
      
      // Balance
      const balanceLabel = entry.netPosition > 0 ? '(Net Debit)' : entry.netPosition < 0 ? '(Net Credit)' : '(Balanced)';
      csvContent += createCSVRow('BALANCE (DR - CR)', formatNumberWithSeparators(entry.netPosition) + ' ' + balanceLabel);
      
      // Footer
      csvContent += '\n';
      csvContent += createCSVRow('Statement generated on', new Date().toLocaleString());
      csvContent += createCSVRow('Currency', entry.currency.toUpperCase());
      
      // Add separator between currencies
      if (index < financialData.length - 1) {
        csvContent += '\n';
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-statement-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (!financialData.length) return;
    
    // Create HTML table for Excel export with professional formatting
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontFamily = 'Arial, sans-serif';
    
    financialData.forEach((entry, index) => {
      // Add currency header row
      const headerRow = table.insertRow();
      headerRow.style.height = '40px';
      const headerCell = headerRow.insertCell();
      headerCell.textContent = `Financial Statement - ${entry.currency.toUpperCase()}`;
      headerCell.style.fontWeight = 'bold';
      headerCell.style.fontSize = '18px';
      headerCell.style.backgroundColor = '#2c3e50';
      headerCell.style.color = 'white';
      headerCell.style.padding = '15px';
      headerCell.style.textAlign = 'center';
      headerCell.style.border = '1px solid #34495e';
      headerCell.colSpan = 3;
      
      // Add date row
      const dateRow = table.insertRow();
      dateRow.style.height = '30px';
      const dateCell = dateRow.insertCell();
      dateCell.textContent = `As of ${new Date().toLocaleDateString()}`;
      dateCell.style.fontSize = '14px';
      dateCell.style.backgroundColor = '#ecf0f1';
      dateCell.style.padding = '8px';
      dateCell.style.textAlign = 'center';
      dateCell.style.border = '1px solid #bdc3c7';
      dateCell.colSpan = 3;
      
      // Add empty row for spacing
      const spacerRow = table.insertRow();
      spacerRow.style.height = '15px';
      const spacerCell = spacerRow.insertCell();
      spacerCell.style.backgroundColor = 'white';
      spacerCell.style.border = 'none';
      spacerCell.colSpan = 3;
      
      // Add table headers
      const tableHeaderRow = table.insertRow();
      tableHeaderRow.style.height = '35px';
      const accountHeaderCell = tableHeaderRow.insertCell();
      accountHeaderCell.textContent = 'Account';
      accountHeaderCell.style.fontWeight = 'bold';
      accountHeaderCell.style.fontSize = '14px';
      accountHeaderCell.style.backgroundColor = '#34495e';
      accountHeaderCell.style.color = 'white';
      accountHeaderCell.style.padding = '12px 8px';
      accountHeaderCell.style.border = '1px solid #2c3e50';
      accountHeaderCell.style.textAlign = 'left';
      
      const debitHeaderCell = tableHeaderRow.insertCell();
      debitHeaderCell.textContent = 'Debit (DR)';
      debitHeaderCell.style.fontWeight = 'bold';
      debitHeaderCell.style.fontSize = '14px';
      debitHeaderCell.style.backgroundColor = '#e74c3c';
      debitHeaderCell.style.color = 'white';
      debitHeaderCell.style.padding = '12px 8px';
      debitHeaderCell.style.textAlign = 'right';
      debitHeaderCell.style.border = '1px solid #c0392b';
      
      const creditHeaderCell = tableHeaderRow.insertCell();
      creditHeaderCell.textContent = 'Credit (CR)';
      creditHeaderCell.style.fontWeight = 'bold';
      creditHeaderCell.style.fontSize = '14px';
      creditHeaderCell.style.backgroundColor = '#27ae60';
      creditHeaderCell.style.color = 'white';
      creditHeaderCell.style.padding = '12px 8px';
      creditHeaderCell.style.textAlign = 'right';
      creditHeaderCell.style.border = '1px solid #229954';
      
      // Add debit entries section header
      const debitSectionRow = table.insertRow();
      debitSectionRow.style.height = '30px';
      const debitSectionCell = debitSectionRow.insertCell();
      debitSectionCell.textContent = 'DEBIT ENTRIES';
      debitSectionCell.style.fontWeight = 'bold';
      debitSectionCell.style.fontSize = '13px';
      debitSectionCell.style.backgroundColor = '#fadbd8';
      debitSectionCell.style.color = '#c0392b';
      debitSectionCell.style.padding = '8px';
      debitSectionCell.style.border = '1px solid #e74c3c';
      debitSectionCell.colSpan = 3;
      
      // Add debit entries
      const debitEntries = [
        ['Settlement Requests', formatNumberWithSeparators(entry.debits.settlementRequests), ''],
        ['Customer payments and order costs', formatNumberWithSeparators(entry.debits.original), '']
      ];
      
      debitEntries.forEach(([label, debitValue, creditValue]) => {
        const row = table.insertRow();
        row.style.height = '28px';
        const labelCell = row.insertCell();
        labelCell.textContent = '  ' + label; // Indent for sub-items
        labelCell.style.padding = '6px 8px';
        labelCell.style.border = '1px solid #ecf0f1';
        labelCell.style.backgroundColor = '#fefefe';
        labelCell.style.fontSize = '12px';
        
        const debitCell = row.insertCell();
        debitCell.textContent = debitValue;
        debitCell.style.padding = '6px 8px';
        debitCell.style.textAlign = 'right';
        debitCell.style.border = '1px solid #ecf0f1';
        debitCell.style.backgroundColor = '#fefefe';
        debitCell.style.fontSize = '12px';
        debitCell.style.fontFamily = 'Courier New, monospace';
        
        const creditCell = row.insertCell();
        creditCell.textContent = creditValue;
        creditCell.style.padding = '6px 8px';
        creditCell.style.textAlign = 'right';
        creditCell.style.border = '1px solid #ecf0f1';
        creditCell.style.backgroundColor = '#fefefe';
        creditCell.style.fontSize = '12px';
        creditCell.style.fontFamily = 'Courier New, monospace';
      });
      
      // Add credit entries section header
      const creditSectionRow = table.insertRow();
      creditSectionRow.style.height = '30px';
      const creditSectionCell = creditSectionRow.insertCell();
      creditSectionCell.textContent = 'CREDIT ENTRIES';
      creditSectionCell.style.fontWeight = 'bold';
      creditSectionCell.style.fontSize = '13px';
      creditSectionCell.style.backgroundColor = '#d5f4e6';
      creditSectionCell.style.color = '#229954';
      creditSectionCell.style.padding = '8px';
      creditSectionCell.style.border = '1px solid #27ae60';
      creditSectionCell.colSpan = 3;
      
      // Add credit entries
      const creditEntries = [
        ['Service Fees', '', formatNumberWithSeparators(entry.credits.serviceFee)],
        ['Gateway Fees', '', formatNumberWithSeparators(entry.credits.gatewayFee)],
        ['Subtotal (Service - Gateway)', '', formatNumberWithSeparators(entry.credits.serviceFee - entry.credits.gatewayFee)]
      ];
      
      creditEntries.forEach(([label, debitValue, creditValue]) => {
        const row = table.insertRow();
        row.style.height = '28px';
        const labelCell = row.insertCell();
        labelCell.textContent = '  ' + label; // Indent for sub-items
        labelCell.style.padding = '6px 8px';
        labelCell.style.border = '1px solid #ecf0f1';
        labelCell.style.backgroundColor = '#fefefe';
        labelCell.style.fontSize = '12px';
        
        const debitCell = row.insertCell();
        debitCell.textContent = debitValue;
        debitCell.style.padding = '6px 8px';
        debitCell.style.textAlign = 'right';
        debitCell.style.border = '1px solid #ecf0f1';
        debitCell.style.backgroundColor = '#fefefe';
        debitCell.style.fontSize = '12px';
        debitCell.style.fontFamily = 'Courier New, monospace';
        
        const creditCell = row.insertCell();
        creditCell.textContent = creditValue;
        creditCell.style.padding = '6px 8px';
        creditCell.style.textAlign = 'right';
        creditCell.style.border = '1px solid #ecf0f1';
        creditCell.style.backgroundColor = '#fefefe';
        creditCell.style.fontSize = '12px';
        creditCell.style.fontFamily = 'Courier New, monospace';
      });
      
      // Add totals row with double underline effect
      const totalsRow = table.insertRow();
      totalsRow.style.height = '35px';
      const totalsLabelCell = totalsRow.insertCell();
      totalsLabelCell.textContent = 'TOTALS';
      totalsLabelCell.style.fontWeight = 'bold';
      totalsLabelCell.style.fontSize = '13px';
      totalsLabelCell.style.backgroundColor = '#34495e';
      totalsLabelCell.style.color = 'white';
      totalsLabelCell.style.padding = '10px 8px';
      totalsLabelCell.style.border = '2px solid #2c3e50';
      totalsLabelCell.style.borderBottom = '3px double #2c3e50';
      
      const totalsDebitCell = totalsRow.insertCell();
      totalsDebitCell.textContent = formatNumberWithSeparators(entry.totalDebits);
      totalsDebitCell.style.fontWeight = 'bold';
      totalsDebitCell.style.fontSize = '13px';
      totalsDebitCell.style.backgroundColor = '#34495e';
      totalsDebitCell.style.color = 'white';
      totalsDebitCell.style.padding = '10px 8px';
      totalsDebitCell.style.textAlign = 'right';
      totalsDebitCell.style.border = '2px solid #2c3e50';
      totalsDebitCell.style.borderBottom = '3px double #2c3e50';
      totalsDebitCell.style.fontFamily = 'Courier New, monospace';
      
      const totalsCreditCell = totalsRow.insertCell();
      totalsCreditCell.textContent = formatNumberWithSeparators(entry.totalCredits);
      totalsCreditCell.style.fontWeight = 'bold';
      totalsCreditCell.style.fontSize = '13px';
      totalsCreditCell.style.backgroundColor = '#34495e';
      totalsCreditCell.style.color = 'white';
      totalsCreditCell.style.padding = '10px 8px';
      totalsCreditCell.style.textAlign = 'right';
      totalsCreditCell.style.border = '2px solid #2c3e50';
      totalsCreditCell.style.borderBottom = '3px double #2c3e50';
      totalsCreditCell.style.fontFamily = 'Courier New, monospace';
      
      // Add balance row
      const balanceRow = table.insertRow();
      balanceRow.style.height = '35px';
      const balanceLabelCell = balanceRow.insertCell();
      balanceLabelCell.textContent = 'BALANCE (DR - CR)';
      balanceLabelCell.style.fontWeight = 'bold';
      balanceLabelCell.style.fontSize = '13px';
      balanceLabelCell.style.backgroundColor = '#3498db';
      balanceLabelCell.style.color = 'white';
      balanceLabelCell.style.padding = '10px 8px';
      balanceLabelCell.style.border = '2px solid #2980b9';
      balanceLabelCell.colSpan = 3;
      
      const balanceValueCell = balanceRow.insertCell();
      const balanceLabel = entry.netPosition > 0 ? '(Net Debit)' : entry.netPosition < 0 ? '(Net Credit)' : '(Balanced)';
      balanceValueCell.textContent = `${formatNumberWithSeparators(entry.netPosition)} ${balanceLabel}`;
      balanceValueCell.style.fontWeight = 'bold';
      balanceValueCell.style.fontSize = '13px';
      balanceValueCell.style.backgroundColor = '#3498db';
      balanceValueCell.style.color = 'white';
      balanceValueCell.style.padding = '10px 8px';
      balanceValueCell.style.textAlign = 'center';
      balanceValueCell.style.border = '2px solid #2980b9';
      balanceValueCell.style.fontFamily = 'Courier New, monospace';
      
      // Add footer
      const footerRow = table.insertRow();
      footerRow.style.height = '25px';
      const footerCell = footerRow.insertCell();
      footerCell.textContent = `Statement generated on ${new Date().toLocaleString()} | Currency: ${entry.currency.toUpperCase()}`;
      footerCell.style.fontSize = '10px';
      footerCell.style.color = '#7f8c8d';
      footerCell.style.padding = '4px';
      footerCell.style.textAlign = 'center';
      footerCell.style.backgroundColor = '#ecf0f1';
      footerCell.style.border = '1px solid #bdc3c7';
      footerCell.colSpan = 3;
      
      // Add separator between currencies
      if (index < financialData.length - 1) {
        const separatorRow = table.insertRow();
        separatorRow.style.height = '30px';
        const separatorCell = separatorRow.insertCell();
        separatorCell.style.backgroundColor = 'white';
        separatorCell.style.border = 'none';
        separatorCell.colSpan = 3;
      }
    });

    // Convert to Excel format
    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Financial Statement Report</title>
        </head>
        <body>
          ${table.outerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cumulative-entries-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!financialData.length) return;
    
    // Create PDF content with professional financial document formatting
    const pdfContent = `
      <html>
        <head>
          <title>Financial Statement Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .currency-section { margin-bottom: 40px; page-break-inside: avoid; }
            .currency-header { 
              background-color: #f3f4f6; 
              padding: 15px; 
              font-weight: bold; 
              font-size: 18px; 
              margin-bottom: 15px;
              border-radius: 4px;
              text-align: center;
              border: 1px solid #d1d5db;
            }
            .currency-date {
              background-color: #f3f4f6;
              padding: 8px;
              font-size: 12px;
              text-align: center;
              margin-bottom: 15px;
              border-radius: 4px;
              border: 1px solid #d1d5db;
            }
            .financial-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
            }
            .financial-table th, .financial-table td { 
              border-bottom: 1px solid #d1d5db; 
              padding: 10px; 
              text-align: left; 
            }
            .financial-table th { 
              background-color: #e5e7eb; 
              font-weight: bold; 
              text-align: center;
              border-bottom: 2px solid #d1d5db;
            }
            .debit-header { background-color: #fee2e2; }
            .credit-header { background-color: #dcfce7; }
            .debit-section { background-color: #fee2e2; font-weight: bold; }
            .credit-section { background-color: #dcfce7; font-weight: bold; }
            .totals-row { 
              background-color: #f3f4f6; 
              font-weight: bold; 
              border-bottom: 3px double #d1d5db;
            }
            .balance-row { 
              background-color: #dbeafe; 
              font-weight: bold; 
              border-bottom: 2px solid #3b82f6;
            }
            .indent { padding-left: 20px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .footer {
              margin-top: 20px;
              padding: 10px;
              background-color: #f9fafb;
              border-radius: 4px;
              font-size: 10px;
              color: #6b7280;
              text-align: center;
              border: 1px solid #d1d5db;
            }
            h1 { color: #333; text-align: center; margin-bottom: 30px; }
            .summary { 
              margin-top: 20px; 
              padding: 15px; 
              background-color: #f9f9f9; 
              border-radius: 4px;
              margin-bottom: 30px;
              border: 1px solid #d1d5db;
            }
          </style>
        </head>
        <body>
          <h1>Financial Statement Report</h1>
          <div class="summary">
            <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Date Range:</strong> ${dateFrom ? new Date(dateFrom).toLocaleDateString() : 'All Time'} - ${dateTo ? new Date(dateTo).toLocaleDateString() : 'All Time'}</p>
            <p><strong>Currency Filter:</strong> ${filterCurrency === 'all' ? 'All Currencies' : filterCurrency.toUpperCase()}</p>
          </div>
          
          ${financialData.map(entry => `
            <div class="currency-section">
              <div class="currency-header">Financial Statement - ${entry.currency.toUpperCase()}</div>
              <div class="currency-date">As of ${new Date().toLocaleDateString()}</div>
              <table class="financial-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th class="debit-header">Debit (DR)</th>
                    <th class="credit-header">Credit (CR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="debit-section">
                    <td colspan="3">DEBIT ENTRIES</td>
                  </tr>
                  <tr>
                    <td class="indent">Settlement Requests</td>
                    <td class="text-right">${formatNumberWithSeparators(entry.debits.settlementRequests)}</td>
                    <td class="text-right">-</td>
                  </tr>
                  <tr>
                    <td class="indent">Customer payments and order costs</td>
                    <td class="text-right">${formatNumberWithSeparators(entry.debits.original)}</td>
                    <td class="text-right">-</td>
                  </tr>
                  <tr class="credit-section">
                    <td colspan="3">CREDIT ENTRIES</td>
                  </tr>
                  <tr>
                    <td class="indent">Service Fees</td>
                    <td class="text-right">-</td>
                    <td class="text-right">${formatNumberWithSeparators(entry.credits.serviceFee)}</td>
                  </tr>
                  <tr>
                    <td class="indent">Gateway Fees</td>
                    <td class="text-right">-</td>
                    <td class="text-right">${formatNumberWithSeparators(entry.credits.gatewayFee)}</td>
                  </tr>
                  <tr>
                    <td class="indent">Subtotal (Service - Gateway)</td>
                    <td class="text-right">-</td>
                    <td class="text-right">${formatNumberWithSeparators(entry.credits.serviceFee - entry.credits.gatewayFee)}</td>
                  </tr>
                  <tr class="totals-row">
                    <td><strong>TOTALS</strong></td>
                    <td class="text-right"><strong>${formatNumberWithSeparators(entry.totalDebits)}</strong></td>
                    <td class="text-right"><strong>${formatNumberWithSeparators(entry.totalCredits)}</strong></td>
                  </tr>
                  <tr class="balance-row">
                    <td colspan="3" class="text-center">
                      <strong>BALANCE (DR - CR): ${formatNumberWithSeparators(entry.netPosition)} 
                      ${entry.netPosition > 0 ? '(Net Debit)' : entry.netPosition < 0 ? '(Net Credit)' : '(Balanced)'}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="footer">
                Statement generated on ${new Date().toLocaleString()} | Currency: ${entry.currency.toUpperCase()}
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    // Use browser's print functionality for PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading financial data...</span>
        </div>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-6 w-6" />
                  <span>Cumulative Financial Entries</span>
                </CardTitle>
                <CardDescription>
                  Financial statement showing all transactions grouped by currency with debit and credit entries
                </CardDescription>
              </div>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Export Statement
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="datetime-local"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="datetime-local"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                    <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="All Currencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Currencies</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GMD">GMD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={loadFinancialData}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
                    setDateFrom(startOfMonth.toISOString().slice(0, 16));
                    setDateTo(endOfDay.toISOString().slice(0, 16));
                    setFilterCurrency('all');
                    setFinancialData([]);
                    setSummary(null);
                    setHasSearched(false);
                    setError('');
                  }}
                  className="bg-white border-gray-300 hover:bg-gray-50"
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Initial State Message */}
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Ready to Search</h3>
              <p className="mt-2 text-sm text-gray-500">
                Set your date range and currency filters, then click Search to view financial data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-6 w-6" />
                <span>Cumulative Financial Entries</span>
              </CardTitle>
              <CardDescription>
                Financial statement showing all transactions grouped by currency with debit and credit entries
              </CardDescription>
            </div>
            {hasSearched && financialData.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="datetime-local"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="datetime-local"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="All Currencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GMD">GMD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={loadFinancialData}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const now = new Date();
                  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
                  setDateFrom(startOfMonth.toISOString().slice(0, 16));
                  setDateTo(endOfDay.toISOString().slice(0, 16));
                  setFilterCurrency('all');
                  setFinancialData([]);
                  setSummary(null);
                  setHasSearched(false);
                  setError('');
                }}
                className="bg-white border-gray-300 hover:bg-gray-50"
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500">Total Currencies</h3>
                      <p className="text-2xl font-bold text-gray-900">{summary.totalCurrencies}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                      <TrendingDown className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500">Total Debits</h3>
                      <p 
                        className="text-xl font-bold text-gray-900"
                        title={formatAmount(summary.totalDebits, 'GMD')}
                      >
                        GMD {formatLargeNumber(summary.totalDebits)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500">Total Credits</h3>
                      <p 
                        className="text-xl font-bold text-gray-900"
                        title={formatAmount(summary.totalCredits, 'GMD')}
                      >
                        GMD {formatLargeNumber(summary.totalCredits)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                      <Calculator className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500">Net Position</h3>
                      <p 
                        className={`text-xl font-bold ${getNetPositionColor(summary.netPosition)}`}
                        title={formatAmount(summary.netPosition, 'GMD')}
                      >
                        GMD {formatLargeNumber(summary.netPosition)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Financial Statement */}
          <div className="space-y-6">
            {financialData.map((entry) => (
              <Card key={entry.currency} className="border-2 border-gray-200">
                <Collapsible
                  open={expandedCurrencies.includes(entry.currency)}
                  onOpenChange={() => toggleCurrencyExpansion(entry.currency)}
                >
                  <CardHeader className="bg-gray-50">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-gray-900">{entry.currency}</span>
                            <Badge variant="outline">Currency</Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>DR: {formatAmount(entry.totalDebits, entry.currency)}</span>
                            <span>CR: {formatAmount(entry.totalCredits, entry.currency)}</span>
                            <span className={`font-semibold ${getNetPositionColor(entry.netPosition)}`}>
                              Net: {formatAmount(entry.netPosition, entry.currency)}
                            </span>
                          </div>
                        </div>
                        {expandedCurrencies.includes(entry.currency) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="p-6">
                      {/* Professional Financial Document Layout */}
                      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                        {/* Header */}
                        <div className="bg-gray-100 border-b border-gray-300 px-6 py-4">
                          <h3 className="text-xl font-bold text-gray-900 text-center">
                            Financial Statement - {entry.currency.toUpperCase()}
                          </h3>
                          <p className="text-sm text-gray-600 text-center mt-1">
                            As of {new Date().toLocaleDateString()}
                          </p>
                        </div>

                        {/* T-Account Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-200 w-1/2">
                                  Account
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-red-700 border-b border-gray-200 w-1/4">
                                  Debit (DR)
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-green-700 border-b border-gray-200 w-1/4">
                                  Credit (CR)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {/* Debit Entries */}
                              <tr className="bg-red-50">
                                <td className="px-6 py-3 text-sm font-semibold text-red-800 border-r border-gray-200">
                                  DEBIT ENTRIES
                                </td>
                                <td className="px-6 py-3 text-right text-sm font-semibold text-red-800"></td>
                                <td className="px-6 py-3 text-right text-sm font-semibold text-red-800"></td>
                              </tr>
                              <tr className="hover:bg-gray-50">
                                <td className="px-6 py-3 text-sm text-gray-700 pl-8">
                                  Settlement Requests
                                </td>
                                <td className="px-6 py-3 text-right text-sm font-medium text-red-900">
                                  {formatAmount(entry.debits.settlementRequests, entry.currency)}
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-gray-500">-</td>
                              </tr>
                              <tr className="hover:bg-gray-50">
                                <td className="px-6 py-3 text-sm text-gray-700 pl-8">
                                  Customer payments and order costs
                                </td>
                                <td className="px-6 py-3 text-right text-sm font-medium text-red-900">
                                  {formatAmount(entry.debits.original, entry.currency)}
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-gray-500">-</td>
                              </tr>

                              {/* Credit Entries */}
                              <tr className="bg-green-50">
                                <td className="px-6 py-3 text-sm font-semibold text-green-800 border-r border-gray-200">
                                  CREDIT ENTRIES
                                </td>
                                <td className="px-6 py-3 text-right text-sm font-semibold text-green-800"></td>
                                <td className="px-6 py-3 text-right text-sm font-semibold text-green-800"></td>
                              </tr>
                              <tr className="hover:bg-gray-50">
                                <td className="px-6 py-3 text-sm text-gray-700 pl-8">
                                  Service Fees
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-gray-500">-</td>
                                <td className="px-6 py-3 text-right text-sm font-medium text-green-900">
                                  {formatAmount(entry.credits.serviceFee, entry.currency)}
                                </td>
                              </tr>
                              <tr className="hover:bg-gray-50">
                                <td className="px-6 py-3 text-sm text-gray-700 pl-8">
                                  Gateway Fees
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-gray-500">-</td>
                                <td className="px-6 py-3 text-right text-sm font-medium text-green-900">
                                  {formatAmount(entry.credits.gatewayFee, entry.currency)}
                                </td>
                              </tr>
                              <tr className="hover:bg-gray-50">
                                <td className="px-6 py-3 text-sm text-gray-700 pl-8">
                                  Subtotal (Service - Gateway)
                                </td>
                                <td className="px-6 py-3 text-right text-sm text-gray-500">-</td>
                                <td className="px-6 py-3 text-right text-sm font-medium text-green-900">
                                  {formatAmount(entry.credits.serviceFee - entry.credits.gatewayFee, entry.currency)}
                                </td>
                              </tr>

                              {/* Totals Row */}
                              <tr className="bg-gray-100 border-t-2 border-gray-300">
                                <td className="px-6 py-4 text-sm font-bold text-gray-900 border-r border-gray-200">
                                  TOTALS
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-red-900 border-r border-gray-200">
                                  {formatAmount(entry.totalDebits, entry.currency)}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-green-900">
                                  {formatAmount(entry.totalCredits, entry.currency)}
                                </td>
                              </tr>

                              {/* Balance Row */}
                              <tr className="bg-blue-50 border-t-2 border-blue-300">
                                <td className="px-6 py-4 text-sm font-bold text-blue-900 border-r border-gray-200">
                                  BALANCE (DR - CR)
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-blue-900 border-r border-gray-200" colSpan={2}>
                                  {formatAmount(entry.netPosition, entry.currency)}
                                  <span className={`ml-2 text-xs ${getNetPositionColor(entry.netPosition)}`}>
                                    {entry.netPosition > 0 ? '(Net Debit)' : entry.netPosition < 0 ? '(Net Credit)' : '(Balanced)'}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Summary Footer */}
                        <div className="bg-gray-50 border-t border-gray-300 px-6 py-4">
                          <div className="flex justify-between items-center text-sm text-gray-600">
                            <span>Statement generated on {new Date().toLocaleString()}</span>
                            <span>Currency: {entry.currency.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}