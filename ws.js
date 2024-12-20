const WebSocket = require('ws');

const wsUri = "wss://io.dexscreener.com/dex/screener/v5/pairs/h24/1?rankBy[key]=trendingScoreH24&rankBy[order]=desc&filters[chainIds][0]=solana";

const headers = {
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'Upgrade',
    'Host': 'io.dexscreener.com',
    'Origin': 'https://dexscreener.com', // Required if server validates `Origin`
    'Pragma': 'no-cache',
    'Sec-WebSocket-Key': 'hqt04HIQYleWx9HErLKKog==',
    'Sec-WebSocket-Version': '13',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };
  
  const ws = new WebSocket(wsUri, { headers });

ws.on('open', () => {
  console.log('WebSocket connection opened.');
});

ws.on('message', (message) => {
  console.log('Message from WebSocket:', message);
});

ws.on('close', () => {
  console.log('WebSocket connection closed.');
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
