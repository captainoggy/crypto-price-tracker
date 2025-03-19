"use strict";

const RPC = require("@hyperswarm/rpc");
const DHT = require("hyperdht");
const Hypercore = require("hypercore");
const Hyperbee = require("hyperbee");
const crypto = require("crypto");
require("dotenv").config();
const { waitForData, fetchPrices } = require("./utils/rpc");

const main = async () => {
  const hcore = new Hypercore("./db/rpc-client");
  const hbee = new Hyperbee(hcore, {
    keyEncoding: "utf-8",
    valueEncoding: "binary",
  });
  await hbee.ready();

  let dhtSeed = (await hbee.get("dht-seed"))?.value;
  if (!dhtSeed) {
    // not found, generate and store in db
    dhtSeed = crypto.randomBytes(32);
    await hbee.put("dht-seed", dhtSeed);
  }

  const dht = new DHT({
    port: 50001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: "127.0.0.1", port: 30001 }],
  });
  await dht.ready();

  const serverPubKey = Buffer.from(process.env.PUBLIC_KEY, "hex");

  const rpc = new RPC({ dht });

  const payload = { nonce: 126 };
  const payloadRaw = Buffer.from(JSON.stringify(payload), "utf-8");
  const respRaw = await rpc.request(serverPubKey, "ping", payloadRaw);
  const resp = JSON.parse(respRaw.toString("utf-8"));
  console.log("Connection established:", resp);

  console.log("Checking for data availability...");
  const hasData = await waitForData(rpc, serverPubKey);
  if (!hasData) {
    console.log("No data available yet, will keep checking periodically");
  }

  await fetchPrices(rpc, serverPubKey);

  const interval = setInterval(() => {
    fetchPrices(rpc, serverPubKey).catch(console.error);
  }, 30000);

  process.on("SIGINT", async () => {
    console.log("\nShutting down client...");
    clearInterval(interval);
    await rpc.destroy();
    await dht.destroy();
    process.exit(0);
  });

  process.stdin.resume();
};

main().catch(console.error);
