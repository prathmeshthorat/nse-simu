# 📈 NSE Market Making & Microstructure Simulator

An institutional-grade, real-time stock market and algorithmic market making simulator built for the browser. Experience how modern high-frequency trading (HFT) and market-making desks operate on the National Stock Exchange of India (NSE).

![Simulator Overview](https://img.shields.io/badge/NSE-Simulation-orange?style=for-the-badge)
![React 19](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=for-the-badge&logo=typescript)
![Vite 8](https://img.shields.io/badge/Vite-8.3-purple?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwind-css)

---

## 🌟 Key Highlights

- **Interactive Scroll & Zoom Canvas**: Click-and-drag horizontal panning through historical candles, mouse wheel scrolling, and Ctrl+Wheel zooming, with floating `⏩ Jump to Live Edge` button.
- **Full Indicator Suite with Toggles**:
  - **EMA 9** (Cyan fast trend) & **EMA 21** (Purple slow trend)
  - **Bollinger Bands** (20-period, 2 std dev with shaded volatility channel)
  - **VWAP** (Volume-Weighted Average Price)
  - **RSI (14)** (Relative Strength Index oscillator with 70/30 overbought/oversold bands)
  - **Fair Value** (Latent theoretical price line)
  - **Market Maker Quotes** (Real-time active Bid/Ask levels)
  - **Execution Fills** (Interactive ▲ Buy / ▼ Sell execution pins on candles)
  - **Volume Histogram** (Color-coded buyer/seller volume bars)
- **5 Quantitative Market Making Strategies**:
  1. **Avellaneda-Stoikov**: Inventory-risk reservation price skewing.
  2. **Imbalance Alpha**: Level-2 queue imbalance predictive flow leaning.
  3. **Adaptive Volatility**: Realized volatility-scaled dynamic spread expansion.
  4. **Multi-Level Grid**: Tiered liquidity quoting across multiple price depths with escalating quote sizes.
  5. **VWAP Mean Reversion**: Intraday volume-weighted average price fading.
- **Dual Visual Modes**: Seamlessly toggle between **60 FPS Candlestick/Line Canvas** and **Cumulative Market Depth Mountain**.
- **Exchange Fee & Maker Rebate Economics**: Models maker rebates (+0.005%) vs taker fees (-0.015%) mirroring real-world HFT margins.
- **Quantitative Scorecard & CSV Exporter**: Live tracking of Sharpe Ratio, Maximum Drawdown, Win Rate %, Maker/Taker Ratio, and one-click execution log CSV export.
- **Zero-Latency Web Audio API Synthesizer**: Subtle harmonic audio chimes for Buy/Sell fills and low-frequency resonance alerts on market shocks.
- **Level-2 Limit Order Book (LOB)**: 10-level side-by-side bids and asks with dynamic depth percentage bars, micro-price, and visual Order Book Imbalance gauge.
- **Interactive Tooltips**: Comprehensive explanations and quantitative guidance on every button, slider, and control.

---

## 📐 Quantitative Architecture & Microstructure

### 1. The Market Maker's Edge (The Spread)

A market maker acts as a liquidity provider by simultaneously quoting:

- **Bid** (Buy Limit Order) below mid-price: $P_{bid} = S_{mid} - \delta$
- **Ask** (Sell Limit Order) above mid-price: $P_{ask} = S_{mid} + \delta$

When both quotes are executed by aggressive market participants (takers), the market maker captures the round-trip spread without taking directional risk:
$$\text{Profit} = P_{ask} - P_{bid} = 2\delta$$

---

### 2. The Avellaneda-Stoikov Reservation Price

In real markets, market makers face **Inventory Risk** (the risk of holding an unhedged position while the market moves against them). To defend against this, the algorithm adjusts its midpoint to an **indifference / reservation price** ($R$):

$$R(s, q, \gamma) = s - q \cdot \gamma \cdot \text{TickSize}$$

Where:

- $s$ = Current Mid Price
- $q$ = Net Inventory (in shares or lots; $+q$ for long, $-q$ for short)
- $\gamma$ = Risk Aversion / Skew Sensitivity Factor

#### How Skewing Protects the Desk:

- **When Long ($q > 0$)**: The algorithm lowers both bid and ask quotes.
  - The lower bid deters sellers from selling more into you.
  - The lower ask makes your sell order the most competitive in the book, rapidly offloading your accumulated inventory.
- **When Short ($q < 0$)**: The algorithm raises both bid and ask quotes to prioritize buying back stock and covering the short.

---

### 3. Order Book Imbalance & Micro-Price

The simulator tracks queue depth across levels to compute the volume-weighted **Micro-Price**:

$$\text{MicroPrice} = \frac{V_{ask} \cdot P_{bid} + V_{bid} \cdot P_{ask}}{V_{ask} + V_{bid}}$$

When the order book is heavily imbalanced ($V_{bid} \gg V_{ask}$), incoming Poisson taker flow tilts towards market buys, triggering realistic short-term price momentum.

---

## 🖥️ Screen Layout & Modules

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  HEADER: Ticker Selector (RELIANCE, TCS, HDFCBANK, TATASTEEL) | LTP | Speed | Guide   │
├─────────────────────────────────────────┬──────────────────────────────────────────────┤
│  CHART (Canvas 60fps)                   │  LEVEL-2 ORDER BOOK (LOB)                    │
│  - Real-time Candlesticks & Wicks       │  - 10 Bids (Green) & 10 Asks (Red)           │
│  - Fair Value (Dashed Gold)             │  - Real-time Visual Depth Percentage Bars    │
│  - VWAP (Dashed Indigo)                 │  - Book Imbalance (% Buyers vs % Sellers)    │
│  - Visual MM Quotes & Execution Markers │  - Mid Price, Micro-Price & Spread in ticks  │
│                                         │  - Click any row to populate Order Ticket    │
├─────────────────────────────────────────┼──────────────────────────────────────────────┤
│  MARKET MAKER STRATEGY ENGINE           │  TIME & SALES (TAPE)                         │
│  - Realized, Unrealized & Total PnL     │  - Streaming millisecond-precision tape      │
│  - Spread Captured ($ edge harvested)   │  - Highlights: "⚡ YOU BUY" / "⚡ YOU SELL"   │
│  - Inventory Risk Gauge (-Max to +Max)  │  - Taker Buy vs Taker Sell Volume Bar        │
│  - Avellaneda-Stoikov Sliders (δ, γ)    │                                              │
│  - Real-time PnL Equity Curve           │                                              │
│  - Discretionary Order Ticket & Flatten │                                              │
├─────────────────────────────────────────┴──────────────────────────────────────────────┤
│  MARKET SHOCKS: [ Whale Buy Sweep ] [ Whale Dump ] [ Flash Crash ] [ Vol Spike ]       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (tested on Node v22.16)
- npm

### Installation

1. Clone or open the repository:

   ```bash
   git clone https://github.com/your-username/nse-simu.git
   cd nse-simu
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:

   ```
   http://localhost:5173
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## 🕹️ Interactive Scenarios to Try

1. **Spread Harvesting**:
   - Keep the regime on **Calm Two-Way**.
   - Observe how your **Spread Captured** steadily increases as both your Bid and Ask get filled alternately.

2. **The Whale Buy Sweep**:
   - Click **Whale Buy Sweep** in the bottom bar.
   - A large institutional buy order will instantly consume 6 levels of ask liquidity.
   - Watch your ask get filled, your inventory flip negative (short), and the reservation price automatically spike upward to repurchase shares.

3. **Defending Against a Flash Crash**:
   - Click **Flash Crash** to trigger an aggressive sell cascade.
   - Watch how the inventory skew lowers your quotes to prevent catastrophic accumulation of toxic inventory, while the **Auto-Hedge** mechanism safely halts downside risk.

4. **Manual Discretionary Trading**:
   - Click any price in the Order Book table to pre-fill the order ticket.
   - Post custom limit orders or click **Instant Market Buy/Sell** to execute immediately against the book.

---

## 📁 Project Structure

```
nse-simu/
├── index.html                   # HTML entry point with dark trading terminal styling
├── package.json                 # Dependencies & scripts
├── vite.config.ts               # Vite configuration with Tailwind CSS plugin
└── src/
    ├── types/
    │   └── market.ts            # Type definitions: Order, Trade, OrderBook, Candle, MMConfig
    ├── simulation/
    │   └── marketEngine.ts      # Core matching engine, Poisson flow & Avellaneda-Stoikov model
    ├── components/
    │   ├── Header.tsx           # Ticker switcher, LTP, day high/low, simulation speed
    │   ├── Chart.tsx            # 60fps Canvas chart for candles, fair value, VWAP, markers
    │   ├── OrderBook.tsx        # Level-2 depth ladder with visual volume bars & imbalance
    │   ├── MarketMakerTerminal.tsx # PnL dashboard, inventory risk meter, equity curve & controls
    │   ├── TimeAndSales.tsx     # Streaming live trade tape with user fill highlights
    │   ├── ScenarioBar.tsx      # Market shock generators (Whales, Flash Crash, Vol Spikes)
    │   └── EducationalModal.tsx # Interactive guide explaining Market Making & Quantitative Skew
    ├── App.tsx                  # Root state orchestration & responsive layout
    ├── index.css                # Tailwind CSS v4 styling & dark mode rules
    └── main.tsx                 # React DOM mount point
```

---

## 🛠️ Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode, verbatim module syntax)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Rendering**: HTML5 Canvas with High-DPI device pixel ratio scaling

---

## 📜 License

MIT License. Designed for quantitative finance enthusiasts, algorithmic traders, and software engineers learning exchange microstructure.
