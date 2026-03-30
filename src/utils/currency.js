// Currency utilities with live rate fetching

const CURRENCIES = {
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
  TWD: { symbol: 'NT$', name: 'Taiwan Dollar' },
  JPY: { symbol: '¥', name: 'Japanese Yen' }
};

// Fallback rates (in case API fails)
const FALLBACK_RATES = {
  HKD: 1,
  TWD: 0.24,
  JPY: 0.052
};

let cachedRates = { ...FALLBACK_RATES };
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

export const fetchExchangeRates = async () => {
  const now = Date.now();
  
  // Return cached rates if still fresh
  if (now - lastFetchTime < CACHE_DURATION && cachedRates.HKD === 1) {
    return cachedRates;
  }

  try {
    // Fetch rates from API (base: HKD)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/HKD');
    const data = await response.json();
    
    cachedRates = {
      HKD: 1,
      TWD: data.rates.TWD || FALLBACK_RATES.TWD,
      JPY: data.rates.JPY || FALLBACK_RATES.JPY
    };
    
    lastFetchTime = now;
    return cachedRates;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return FALLBACK_RATES;
  }
};

export const convertCurrency = (amount, fromCurrency, toCurrency, rates) => {
  const amountInHKD = amount * rates[fromCurrency];
  return amountInHKD / rates[toCurrency];
};

export const formatCurrency = (amount, currency) => {
  const currencyInfo = CURRENCIES[currency];
  if (!currencyInfo) return `${amount.toFixed(2)}`;
  
  if (currency === 'JPY') {
    return `${currencyInfo.symbol}${Math.round(amount).toLocaleString()}`;
  }
  return `${currencyInfo.symbol}${amount.toFixed(2)}`;
};

export const getCurrencySymbol = (currency) => {
  return CURRENCIES[currency]?.symbol || currency;
};

export const parseCurrencyFromText = (text) => {
  const lowerText = text.toLowerCase();
  if (/jpy|yen|¥/i.test(lowerText)) return 'JPY';
  if (/twd|nt|taiwan/i.test(lowerText)) return 'TWD';
  if (/hkd|hk/i.test(lowerText)) return 'HKD';
  return null;
};

export { CURRENCIES };