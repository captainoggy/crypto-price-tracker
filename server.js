"use strict";

const RPC = require("@hyperswarm/rpc");
const DHT = require("hyperdht");
const Hypercore = require("hypercore");
const Hyperbee = require("hyperbee");
const crypto = require("crypto");
const CoinGeckoService = require("./services/coingecko");
const { storePriceData } = require("./utils/price");

const main = async () => {
  // hyperbee db
  const hcore = new Hypercore("./db/rpc-server");
  const hbee = new Hyperbee(hcore, {
    keyEncoding: "utf-8",
    valueEncoding: "binary",
  });
  await hbee.ready();
  let collectionInterval;

  let dhtSeed = (await hbee.get("dht-seed"))?.value;
  if (!dhtSeed) {
    dhtSeed = crypto.randomBytes(32);
    await hbee.put("dht-seed", dhtSeed);
  }

  const dht = new DHT({
    port: 40001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: "127.0.0.1", port: 30001 }],
  });
  await dht.ready();

  let rpcSeed = (await hbee.get("rpc-seed"))?.value;
  if (!rpcSeed) {
    rpcSeed = crypto.randomBytes(32);
    await hbee.put("rpc-seed", rpcSeed);
  }

  const rpc = new RPC({ seed: rpcSeed, dht });
  const rpcServer = rpc.createServer();
  await rpcServer.listen();
  console.log(
    "rpc server started listening on public key:",
    rpcServer.publicKey.toString("hex")
  );

  rpcServer.respond("ping", async (reqRaw) => {
    const req = JSON.parse(reqRaw.toString("utf-8"));

    const resp = { nonce: req.nonce + 1 };

    const respRaw = Buffer.from(JSON.stringify(resp), "utf-8");
    return respRaw;
  });

  const coingecko = new CoinGeckoService();

  // Remove the original storePriceData function

  async function collectData() {
    try {
      const topCoins = await coingecko.getTopCoins(5);

      const topExchanges = await coingecko.getTopExchanges(3);
      const prices = await coingecko.getPrices(topCoins, topExchanges);
      await storePriceData(hbee, prices);
    } catch (error) {
      console.error("Data collection failed:", error);
    }
  }

  rpcServer.respond("getLatestPrices", async (reqRaw) => {
    const req = JSON.parse(reqRaw.toString("utf-8"));
    const pairs = req.pairs || [];
    const results = {};

    for (const pair of pairs) {
      const stream = hbee.createReadStream({
        gte: `price:${pair}:`,
        lte: `price:${pair}:\xff`,
        reverse: true,
        limit: 1,
      });

      for await (const { value } of stream) {
        results[pair] = JSON.parse(value.toString());
      }
    }

    return Buffer.from(JSON.stringify(results));
  });

  rpcServer.respond("getHistoricalPrices", async (reqRaw) => {
    const { pairs, from, to } = JSON.parse(reqRaw.toString("utf-8"));
    const results = {};

    for (const pair of pairs) {
      results[pair] = [];
      const stream = hbee.createReadStream({
        gte: `price:${pair}:${from}`,
        lte: `price:${pair}:${to}`,
      });

      for await (const { value } of stream) {
        results[pair].push(JSON.parse(value.toString()));
      }
    }

    return Buffer.from(JSON.stringify(results));
  });

  await collectData();
  collectionInterval = setInterval(collectData, 30000);
};

main().catch(console.error);
