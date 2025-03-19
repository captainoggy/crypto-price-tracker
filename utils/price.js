"use strict";

function formatPriceData(data) {
  const formatted = {};
  for (const [coin, prices] of Object.entries(data)) {
    if (Array.isArray(prices)) {
      formatted[coin] = prices.map((p) => ({
        timestamp: new Date(p.timestamp).toLocaleString(),
        price: p.avgPrice,
        exchanges: p.exchanges.map((e) => `${e.id}: ${e.p}`).join(", "),
      }));
    } else {
      formatted[coin] = {
        timestamp: new Date(prices.timestamp).toLocaleString(),
        price: prices.avgPrice,
        exchanges: prices.exchanges.map((e) => `${e.id}: ${e.p}`).join(", "),
      };
    }
  }
  return formatted;
}

async function storePriceData(hbee, prices) {
  if (!Array.isArray(prices) || prices.length === 0) {
    console.log("No valid price data to store");
    return;
  }

  for (const price of prices) {
    try {
      const key = `price:${price.coin}:${price.timestamp}`;
      const storageData = {
        coin: price.coin,
        timestamp: price.timestamp,
        avgPrice: price.price,
        exchanges: price.exchanges.map((e) => ({ id: e.id, p: e.price })),
      };
      await hbee.put(key, Buffer.from(JSON.stringify(storageData)));
    } catch (error) {
      console.error(`Failed to store price data for ${price.coin}:`, error);
    }
  }
}

module.exports = {
  formatPriceData,
  storePriceData,
};
