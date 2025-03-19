# Crypto Price Tracker

A decentralized cryptocurrency price tracking system that collects and serves real-time price data from major exchanges using CoinGecko's API.

## Features

- Real-time price tracking for top cryptocurrencies
- Decentralized architecture using Hypercore and DHT
- Historical price data storage and retrieval
- Rate-limited API requests to prevent throttling
- Support for multiple exchanges
- Automatic data collection every 30 seconds

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/captainoggy/crypto-price-tracker
cd crypto-price-tracker
```

2. Start the DHT bootstrap node:

```bash
hyperdht --bootstrap --host 127.0.0.1 --port 30001
```

3. Install the dependencies:

```bash
npm install
```

4. Run the server.js file:

```bash
node server.js
```

It will generate Public key placed it in .env file with name PUBLIC_KEY

5. Run the client.js file:

```bash
node client.js
```
