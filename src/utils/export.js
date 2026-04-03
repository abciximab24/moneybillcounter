export const exportExpensesToCSV = (expenses, trip, exchangeRates) => {
  if (!expenses || expenses.length === 0) {
    alert('No expenses to export');
    return;
  }

  // CSV headers
  const headers = [
    'Date',
    'Description',
    'Category',
    'Payer',
    'Amount',
    'Currency',
    'Amount (Base Currency)',
    'Split Mode',
    'Split With',
    'Share Per Person'
  ];

  // Helper: always wrap strings in quotes to prevent CSV breakage
  const quote = (val) => {
    const str = val == null ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  // Format date as YYYY-MM-DD HH:MM:SS (no commas)
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const d = new Date(timestamp);
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  // Build rows
  const rows = expenses.map(expense => {
    const date = formatDate(expense.timestamp);
    const description = quote(expense.desc || '');
    const category = expense.category || 'other';
    const payer = quote(expense.payer || '');
    const amount = expense.amount ?? 0;
    const currency = expense.currency || trip.baseCurrency;

    const rate = exchangeRates[currency] || 1;
    const baseAmount = (amount * rate).toFixed(2);

    const splitMode = expense.splitMode || 'equal';

    const splitWithName = Array.isArray(expense.splitWith) && expense.splitWith.length > 0
      ? expense.splitWith.join(', ')
      : trip.members.map(m => m.name).join(', ');
    const splitWith = quote(splitWithName);

    const splitCount = expense.splitWith && expense.splitWith.length > 0
      ? expense.splitWith.length
      : trip.members.length;
    const sharePerPerson = splitCount > 0
      ? (baseAmount / splitCount).toFixed(2)
      : baseAmount;

    return [
      quote(date),
      description,
      quote(category),
      payer,
      amount.toString(),
      quote(currency),
      baseAmount,
      quote(splitMode),
      splitWith,
      sharePerPerson
    ];
  });

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create filename
  const tripName = (trip.name || 'trip').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${tripName}-expenses-${dateStr}.csv`;

  // Download CSV
  downloadCSV(csvContent, filename);
};

const downloadCSV = (content, filename) => {
  // Add BOM for UTF-8 to support special characters in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);};