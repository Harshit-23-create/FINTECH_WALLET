// Static mock exchange rates relative to 1 USD
const rates = {
  USD: 1.0,
  INR: 83.5,
  AED: 3.67,
  EUR: 0.92
};

const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to USD first (base), then to target
  const amountInUSD = amount / (rates[fromCurrency] || 1);
  const finalAmount = amountInUSD * (rates[toCurrency] || 1);
  
  return parseFloat(finalAmount.toFixed(4));
};

const getExchangeRate = (fromCurrency, toCurrency) => {
  return (rates[toCurrency] || 1) / (rates[fromCurrency] || 1);
};

module.exports = { rates, convertCurrency, getExchangeRate };
