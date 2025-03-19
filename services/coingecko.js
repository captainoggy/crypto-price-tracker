"use strict";

const axios = require("axios");

class CoinGeckoService {
  constructor() {
    this.api = axios.create({
      baseURL: "https://api.coingecko.com/api/v3",
      timeout: 10000,
    });
    this.lastRequestTime = 0;
    this.minRequestInterval = 2000;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async makeRequest(endpoint, params = {}) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      await this.sleep(this.minRequestInterval - timeSinceLastRequest);
    }

    try {
      this.lastRequestTime = Date.now();
      const response = await this.api.get(endpoint, { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        console.log("Rate limited, waiting 60 seconds...");
        await this.sleep(60000);
        return this.makeRequest(endpoint, params);
      }
      throw error;
    }
  }

  async getTopCoins(limit = 5) {
    const data = await this.makeRequest("/coins/markets", {
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: limit,
      page: 1,
    });
    return data.map((coin) => coin.id);
  }

  async getTopExchanges(limit = 3) {
    const data = await this.makeRequest("/exchanges", {
      per_page: limit,
      page: 1,
    });
    return data.map((exchange) => exchange.id);
  }

  async getPrices(coinIds, exchangeIds) {
    const prices = [];
    for (const coinId of coinIds) {
      const data = await this.makeRequest(`/coins/${coinId}/tickers`);
      const exchangePrices = data.tickers
        .filter(
          (ticker) =>
            exchangeIds.includes(ticker.market.identifier) &&
            ticker.target === "USDT"
        )
        .map((ticker) => ({
          exchange: ticker.market.identifier,
          price: ticker.last,
        }));

      if (exchangePrices.length > 0) {
        const avgPrice =
          exchangePrices.reduce((sum, ep) => sum + ep.price, 0) /
          exchangePrices.length;
        prices.push({
          coin: coinId,
          timestamp: Date.now(),
          price: avgPrice,
          exchanges: exchangePrices.map((ep) => ({
            id: ep.exchange,
            price: ep.price,
          })),
        });
      }
    }
    return prices;
  }
}

module.exports = CoinGeckoService;
