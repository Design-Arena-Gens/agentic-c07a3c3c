"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { computeRSI } from "@/lib/indicators";
import { computeLevelsFromFirstFive, LevelSet } from "@/lib/levels";
import { analyzeSignals, SignalInsight } from "@/lib/signals";

const TVChart = dynamic(() => import("@/components/TVChart"), { ssr: false });

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export default function Page() {
  const [symbol, setSymbol] = useState<string>("^NSEI");
  const [interval, setInterval] = useState<string>("1m");
  const [range, setRange] = useState<string>("1d");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [levels, setLevels] = useState<LevelSet | null>(null);
  const [rsiPeriod, setRsiPeriod] = useState<number>(14);
  const [rsiOb, setRsiOb] = useState<number>(70);
  const [rsiOs, setRsiOs] = useState<number>(30);
  const [rsi, setRsi] = useState<number[]>([]);
  const [insights, setInsights] = useState<SignalInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ohlc?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`);
      const data = await res.json();
      setCandles(data.candles);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, range]);

  useEffect(() => {
    fetchData();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => fetchData(), 15000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchData]);

  useEffect(() => {
    if (candles.length === 0) return;
    const lv = computeLevelsFromFirstFive(candles);
    setLevels(lv);
    const r = computeRSI(candles.map(c => c.close), rsiPeriod);
    setRsi(r);
    setInsights(analyzeSignals(candles, lv, r, { overbought: rsiOb, oversold: rsiOs }));
  }, [candles, rsiPeriod, rsiOb, rsiOs]);

  const latest = candles[candles.length - 1];

  return (
    <div className="container">
      <div className="header">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <h2 style={{margin:0}}>Nifty 50 AI Trading Agent</h2>
          <span className="badge">Live</span>
        </div>
        <div className="controls">
          <select value={symbol} onChange={e => setSymbol(e.target.value)}>
            <option value="^NSEI">NIFTY 50 (^NSEI)</option>
            <option value="^NSEBANK">NIFTY BANK (^NSEBANK)</option>
          </select>
          <select value={interval} onChange={e => setInterval(e.target.value)}>
            <option value="1m">1m</option>
            <option value="5m">5m</option>
          </select>
          <select value={range} onChange={e => setRange(e.target.value)}>
            <option value="1d">1d</option>
            <option value="5d">5d</option>
          </select>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span className="small">RSI</span>
            <input type="number" min={2} max={100} value={rsiPeriod} onChange={e => setRsiPeriod(parseInt(e.target.value||"14",10))} style={{width:70}} />
            <span className="small">OB</span>
            <input type="number" min={50} max={100} value={rsiOb} onChange={e => setRsiOb(parseInt(e.target.value||"70",10))} style={{width:70}} />
            <span className="small">OS</span>
            <input type="number" min={0} max={50} value={rsiOs} onChange={e => setRsiOs(parseInt(e.target.value||"30",10))} style={{width:70}} />
          </div>
          <button onClick={fetchData} disabled={loading}>{loading?"Refreshing...":"Refresh"}</button>
        </div>
      </div>
      <div className="grid">
        <div className="card">
          <TVChart candles={candles} rsi={rsi} rsiOb={rsiOb} rsiOs={rsiOs} levels={levels || undefined} />
        </div>
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{margin:0}}>AI Insights</h3>
            {latest && <span className="small">Last: {latest.close.toFixed(2)}</span>}
          </div>
          <hr/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {levels && (
              <div>
                <div className="level"><span>A (High):</span><span>{levels.A.toFixed(2)}</span></div>
                <div className="level"><span>B (Low):</span><span>{levels.B.toFixed(2)}</span></div>
                <div className="level"><span>A1-A4:</span><span>{[levels.A1,levels.A2,levels.A3,levels.A4].map(v=>v.toFixed(2)).join(" | ")}</span></div>
                <div className="level"><span>B1-B4:</span><span>{[levels.B1,levels.B2,levels.B3,levels.B4].map(v=>v.toFixed(2)).join(" | ")}</span></div>
              </div>
            )}
            <hr/>
            {insights.length === 0 ? (<div className="small">Waiting for confluence near levels...</div>) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {insights.slice(-10).map((s, i) => (
                  <div key={i} className={`signal ${s.direction}`}>
                    <span className="badge">{s.type}</span>
                    <div>
                      <div>{s.message}</div>
                      <div className="small">{new Date(s.time*1000).toLocaleTimeString()} @ {s.price.toFixed(2)} | RSI {Math.round(s.rsi)} | Lvl {s.levelName}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="small" style={{opacity:.8,marginTop:12}}>Data is polled ~15s. Levels derive from first 5-minute candle of the session.</p>
    </div>
  );
}
