"use strict";

const { formatPriceData } = require("./price");

async function waitForData(rpc, serverPubKey, maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const testPayload = { pairs: ["bitcoin"] };
      const testRaw = await rpc.request(
        serverPubKey,
        "getLatestPrices",
        Buffer.from(JSON.stringify(testPayload))
      );
      const data = JSON.parse(testRaw.toString());

      if (Object.keys(data).length > 0 && data.bitcoin) {
        return true;
      }
      console.log(`Waiting for data (attempt ${i + 1}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Error checking data:", error);
    }
  }
  return false;
}

async function fetchPrices(rpc, serverPubKey) {
  try {
    console.clear();
    console.log(`Fetching prices at ${new Date().toLocaleTimeString()}`);

    const latestPricesPayload = {
      pairs: ["bitcoin", "ethereum"],
    };
    const latestPricesRaw = await rpc.request(
      serverPubKey,
      "getLatestPrices",
      Buffer.from(JSON.stringify(latestPricesPayload))
    );
    const latestPrices = JSON.parse(latestPricesRaw.toString());

    if (Object.keys(latestPrices).length === 0) {
      console.log("\nNo price data available yet");
      return;
    }

    console.log("\nLatest Prices:", formatPriceData(latestPrices));

    const historicalPricesPayload = {
      pairs: ["bitcoin", "ethereum"],
      from: Date.now() - 3600000,
      to: Date.now(),
    };
    const historicalPricesRaw = await rpc.request(
      serverPubKey,
      "getHistoricalPrices",
      Buffer.from(JSON.stringify(historicalPricesPayload))
    );
    const historicalPrices = JSON.parse(historicalPricesRaw.toString());
    console.log("\nHistorical Prices:", formatPriceData(historicalPrices));
    console.log("\nNext update in 30 seconds...");
    let countdown = 30;
    const countdownInterval = setInterval(() => {
      process.stdout.write(`\r${countdown} seconds remaining...`);
      countdown--;
      if (countdown < 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);
  } catch (error) {
    console.error("Error fetching prices:", error);
  }
}

module.exports = {
  waitForData,
  fetchPrices,
};
