export type OrderSide = 'BUY' | 'SELL';

export type OrderType = 'LIMIT' | 'MARKET';

export interface Order {
  id: string;
  side: OrderSide;
  price: number;
  size: number;
  remainingSize: number;
  timestamp: number;
  isUser: boolean; // whether this is placed by our market maker
  participantType: 'USER_MM' | 'COMPETITOR_MM' | 'RETAIL' | 'INSTITUTION';
}

export interface Trade {
  id: string;
  timestamp: number;
  price: number;
  size: number;
  takerSide: OrderSide;
  isUserTrade: boolean;
  userSide?: OrderSide;
  userRole?: 'MAKER' | 'TAKER';
}

export interface OrderBookLevel {
  price: number;
  totalSize: number;
  orderCount: number;
  userSize: number;
  hasUserOrder: boolean;
  cumulativeSize: number;
  depthPercent: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadBps: number;
  midPrice: number;
  microPrice: number; // weighted by bid/ask imbalance
  imbalance: number; // (bidVol - askVol) / (bidVol + askVol)
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  userBuyVol: number;
  userSellVol: number;
}

export interface MarketMakerConfig {
  autoQuoting: boolean;
  halfSpreadTicks: number; // ticks away from fair value/mid
  quoteSize: number; // shares per quote
  inventorySkewFactor: number; // how aggressively to skew quotes based on inventory
  maxInventory: number; // hard inventory stop
  autoHedge: boolean; // market hedge when inventory exceeds threshold
  hedgeThreshold: number;
  cancelReplaceFreqMs: number; // algorithmic quote refresh rate
}

export interface MarketMakerStats {
  cash: number;
  inventory: number; // shares held (+ long, - short)
  avgCost: number; // average purchase/short price
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  tradesCount: number;
  userFillsCount: number;
  volumeTraded: number;
  spreadCaptured: number;
  pnlHistory: { time: number; pnl: number }[];
}

export interface TickerInfo {
  symbol: string;
  name: string;
  exchange: string;
  initialPrice: number;
  tickSize: number;
  lotSize: number;
  currency: string;
  dailyHigh: number;
  dailyLow: number;
  prevClose: number;
}

export type MarketRegime = 'NORMAL' | 'HIGH_VOLATILITY' | 'BULL_RALLY' | 'FLASH_CRASH' | 'WHALE_ACCUMULATION';
