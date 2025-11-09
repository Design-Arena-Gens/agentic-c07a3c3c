import { NextRequest } from "next/server";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "^NSEI";
  const interval = searchParams.get("interval") || "1m"; // 1m or 5m
  const range = searchParams.get("range") || "1d"; // 1d or 5d

  const base = "https://query2.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol);
  const qs = new URLSearchParams({ interval, range, includePrePost: "false" }).toString();
  const url = `${base}?${qs}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AgenticBot/1.0; +https://vercel.app)",
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://finance.yahoo.com/",
    },
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "upstream", status: res.status }), { status: 502 });
  }
  const json = await res.json();
  try {
    const r = json.chart.result[0];
    const timestamps: number[] = r.timestamp;
    const o = r.indicators.quote[0];
    const candles = timestamps.map((t: number, idx: number) => ({
      time: t, open: o.open[idx], high: o.high[idx], low: o.low[idx], close: o.close[idx], volume: o.volume[idx],
    })).filter((c: any) => isFinite(c.open) && isFinite(c.high) && isFinite(c.low) && isFinite(c.close));
    return new Response(JSON.stringify({ candles }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "parse" }), { status: 500 });
  }
}
