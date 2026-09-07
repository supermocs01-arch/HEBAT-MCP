import { launch } from 'file:///C:/HEBAT/tradingview-mcp/src/core/health.js';
const info = await launch({ killFirst: true });
console.log(JSON.stringify(info, null, 2));