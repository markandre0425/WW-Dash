import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

const WALLET_ADDRESS = "0x98d2aa3aFa43171c421e5aFbA7091f53Ff4D808E";
const ETHERSCAN_BASE = "https://api.etherscan.io/api";

/* Types */

interface Transaction {
  id: string;
  hash: string;
  type: "send" | "receive" | "swap" | "contract";
  asset: string;
  amount: string;
  to: string;
  from: string;
  date: string;
  time: string;
  status: "completed" | "pending" | "failed";
  usd: string;
  timestamp: number;
}

/* Fetch helpers */

async function fetchNormalTxs(): Promise<any[]> {
  const url = `${ETHERSCAN_BASE}?module=account&action=txlist&address=${WALLET_ADDRESS}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "1" && Array.isArray(data.result)) return data.result;
  return [];
}

async function fetchTokenTxs(): Promise<any[]> {
  const url = `${ETHERSCAN_BASE}?module=account&action=tokentx&address=${WALLET_ADDRESS}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "1" && Array.isArray(data.result)) return data.result;
  return [];
}

async function fetchEthPrice(): Promise<number> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    const data = await res.json();
    return data.ethereum?.usd ?? 2800;
  } catch {
    return 2800;
  }
}

/* Parse transactions */

function parseNormalTx(tx: any, ethPrice: number): Transaction {
  const isSend = tx.from.toLowerCase() === WALLET_ADDRESS.toLowerCase();
  const isContractInteraction = tx.input && tx.input !== "0x" && !isSend;
  const valueEth = parseFloat(tx.value) / 1e18;
  const usdVal = valueEth * ethPrice;
  const ts = parseInt(tx.timeStamp) * 1000;
  const d = new Date(ts);
  const failed = tx.isError === "1" || tx.txreceipt_status === "0";

  return {
    id: `${tx.hash.slice(0, 10)}`,
    hash: tx.hash,
    type: isContractInteraction ? "contract" : isSend ? "send" : "receive",
    asset: "ETH",
    amount: valueEth < 0.001 && valueEth > 0 ? valueEth.toFixed(6) : valueEth.toFixed(4),
    to: isSend ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`,
    from: tx.from,
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    status: failed ? "failed" : "completed",
    usd: `$ ${usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    timestamp: ts,
  };
}

function parseTokenTx(tx: any, ethPrice: number): Transaction {
  const isSend = tx.from.toLowerCase() === WALLET_ADDRESS.toLowerCase();
  const decimals = parseInt(tx.tokenDecimal) || 18;
  const value = parseFloat(tx.value) / Math.pow(10, decimals);
  const symbol = tx.tokenSymbol || "TOKEN";
  const ts = parseInt(tx.timeStamp) * 1000;
  const d = new Date(ts);

  // Rough USD estimate: for known tokens, try to price them; else show "—"
  let usdStr = "—";
  if (symbol === "USDC" || symbol === "USDT" || symbol === "DAI") {
    usdStr = `$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (symbol === "WETH") {
    const usd = value * ethPrice;
    usdStr = `$ ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return {
    id: `${tx.hash.slice(0, 10)}`,
    hash: tx.hash,
    type: isSend ? "send" : "receive",
    asset: symbol,
    amount: value < 0.001 && value > 0 ? value.toFixed(6) : value < 1 ? value.toFixed(4) : value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    to: isSend ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`,
    from: tx.from,
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    status: "completed",
    usd: usdStr,
    timestamp: ts,
  };
}

/* Mock fallback data */

const mockTransactions: Transaction[] = [
  { id: "0x3fa1b2...", hash: "0x3fa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9", type: "send", asset: "ETH", amount: "2.5000", to: "0x7a3F...9c2E", from: WALLET_ADDRESS, date: "Feb 24, 2026", time: "14:23", status: "completed", usd: "$ 7,118.07", timestamp: Date.now() - 3600000 },
  { id: "0x8bc2d3...", hash: "0x8bc2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0", type: "receive", asset: "ETH", amount: "5.0000", to: "0x1eC3...8d2F", from: "0x1eC38d2F", date: "Feb 21, 2026", time: "07:02", status: "completed", usd: "$ 14,236.15", timestamp: Date.now() - 86400000 * 3 },
  { id: "0x4de3f4...", hash: "0x4de3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1", type: "receive", asset: "CSCS", amount: "500.00", to: "Staking Pool", from: "0xa6Ec49E06C25F63292bac1Abc1896451A0f4cFB7", date: "Feb 23, 2026", time: "08:12", status: "completed", usd: "$ 510.00", timestamp: Date.now() - 86400000 },
  { id: "0x5ef4a5...", hash: "0x5ef4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2", type: "send", asset: "ETH", amount: "0.3500", to: "0x4b2D...7f1A", from: WALLET_ADDRESS, date: "Feb 22, 2026", time: "22:31", status: "completed", usd: "$ 996.53", timestamp: Date.now() - 86400000 * 2 },
  { id: "0x6fa5b6...", hash: "0x6fa5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3", type: "receive", asset: "CSCR", amount: "1,200.00", to: "0x9d2F...4a1B", from: "0x9C9580A8915d2797fb9E9651c93aE1559D8A498e", date: "Feb 21, 2026", time: "10:44", status: "completed", usd: "$ 686.40", timestamp: Date.now() - 86400000 * 3 },
];

/* Hook */

function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [normalTxs, tokenTxs, ethPrice] = await Promise.all([
        fetchNormalTxs(),
        fetchTokenTxs(),
        fetchEthPrice(),
      ]);

      if (normalTxs.length === 0 && tokenTxs.length === 0) {
        // Etherscan returned no results or rate limited — use mock
        setTransactions(mockTransactions);
        setIsLive(false);
        setLoading(false);
        return;
      }

      const parsed: Transaction[] = [
        ...normalTxs.map((tx: any) => parseNormalTx(tx, ethPrice)),
        ...tokenTxs.map((tx: any) => parseTokenTx(tx, ethPrice)),
      ];

      // Deduplicate by hash (a tx can appear in both normal and token lists)
      const seen = new Set<string>();
      const deduped = parsed.filter((tx) => {
        const key = tx.hash + tx.asset;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      deduped.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(deduped);
      setIsLive(true);
    } catch {
      setTransactions(mockTransactions);
      setIsLive(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { transactions, loading, isLive, refetch: fetchData };
}

/* Component */

type FilterType = "all" | "send" | "receive" | "swap" | "contract";

export function TransactionsPage() {
  const { transactions, loading, isLive, refetch } = useTransactions();
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = transactions.filter((tx) => {
    const matchesFilter = filter === "all" || tx.type === filter;
    const matchesSearch =
      searchQuery === "" ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Compute summary totals
  const totals = transactions.reduce(
    (acc, tx) => {
      const val = parseFloat(tx.usd.replace(/[^0-9.-]/g, "")) || 0;
      if (tx.type === "send") acc.sent += val;
      else if (tx.type === "receive") acc.received += val;
      else if (tx.type === "swap") acc.swaps += val;
      else if (tx.type === "contract") acc.swaps += val;
      return acc;
    },
    { sent: 0, received: 0, swaps: 0 }
  );

  const filters: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Sent", value: "send" },
    { label: "Received", value: "receive" },
    { label: "Swaps", value: "swap" },
    { label: "Contracts", value: "contract" },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "send": return "↑";
      case "receive": return "↓";
      case "swap": return "⇆";
      case "contract": return "⚙";
      default: return "•";
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case "send": return "bg-[#fb035c]/20 text-[#fb035c]";
      case "receive": return "bg-[#00ffa3]/20 text-[#00ffa3]";
      case "swap": return "bg-[rgba(0,170,255,0.2)] text-[#00aaff]";
      case "contract": return "bg-[#aa9cff]/20 text-[#aa9cff]";
      default: return "bg-white/10 text-white";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed": return "text-[#00ffa3] bg-[#00ffa3]/10";
      case "pending": return "text-[#ffaa00] bg-[#ffaa00]/10";
      case "failed": return "text-[#fb035c] bg-[#fb035c]/10";
      default: return "text-white bg-white/10";
    }
  };

  const handleExportCSV = () => {
    const header = "Hash,Type,Asset,Amount,To/From,USD,Date,Time,Status\n";
    const rows = filtered.map((tx) =>
      `${tx.hash},${tx.type},${tx.asset},${tx.amount},${tx.to},${tx.usd.replace(",", "")},${tx.date},${tx.time},${tx.status}`
    ).join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${WALLET_ADDRESS.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  return (
    <div className="flex flex-col gap-[20px] flex-1 max-w-[1100px]">
      {/* Header */}
      <div className="backdrop-blur-[10px] bg-[#1c1c1c]/60 rounded-[16px] p-[24px]">
        <div className="flex items-center justify-between mb-[20px]">
          <div className="flex items-center gap-[12px]">
            <h2 className="font-['Inter',sans-serif] font-bold text-[24px] text-white">Transactions</h2>
            {isLive && (
              <div className="flex items-center gap-[6px] bg-[#00ffa3]/10 rounded-[8px] px-[8px] py-[3px]">
                <div className="w-[6px] h-[6px] rounded-full bg-[#00ffa3] animate-pulse" />
                <span className="font-['Inter',sans-serif] text-[11px] text-[#00ffa3]">Live</span>
              </div>
            )}
            {!isLive && !loading && (
              <div className="flex items-center gap-[6px] bg-[#ffaa00]/10 rounded-[8px] px-[8px] py-[3px]">
                <div className="w-[6px] h-[6px] rounded-full bg-[#ffaa00]" />
                <span className="font-['Inter',sans-serif] text-[11px] text-[#ffaa00]">Mock data</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-[8px]">
            <button
              onClick={() => { refetch(); toast("Refreshing transactions..."); }}
              className="bg-[#2b2b2b] rounded-[8px] px-[12px] py-[8px] font-['Inter',sans-serif] text-[14px] text-white cursor-pointer hover:bg-[#363636] transition-colors"
              title="Refresh"
            >
              ↻
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-[#2b2b2b] rounded-[8px] px-[16px] py-[8px] font-['Inter',sans-serif] text-[14px] text-white cursor-pointer hover:bg-[#363636] transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Wallet badge */}
        <div className="flex items-center gap-[8px] mb-[16px]">
          <span className="font-['Inter',sans-serif] text-[12px] text-[#86909c]">Wallet:</span>
          <a
            href={`https://etherscan.io/address/${WALLET_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-['Inter',sans-serif] text-[12px] text-[#0FC6C2] hover:underline"
          >
            {WALLET_ADDRESS.slice(0, 6)}...{WALLET_ADDRESS.slice(-4)}
          </a>
          <span className="font-['Inter',sans-serif] text-[11px] text-[#86909c]">· Ethereum Mainnet</span>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-[12px] flex-wrap">
          <div className="flex items-center gap-[4px] bg-[#2b2b2b] rounded-[12px] p-[4px]">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-[14px] py-[6px] rounded-[8px] font-['Inter',sans-serif] text-[14px] cursor-pointer transition-all ${
                  filter === f.value
                    ? "bg-[rgba(0,170,255,0.5)] text-white"
                    : "text-[#86909c] hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            className="flex-1 bg-[#2b2b2b] rounded-[12px] px-[16px] py-[8px] font-['Inter',sans-serif] text-[14px] text-white outline-none placeholder-white/40 min-w-[200px]"
            placeholder="Search by hash, asset, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex gap-[12px]">
        <div className="backdrop-blur-[10px] bg-[#1c1c1c]/60 rounded-[16px] p-[16px] flex-1">
          <p className="font-['Inter',sans-serif] font-normal text-[14px] text-[#86909c] mb-[4px]">Total Sent</p>
          <p className="font-['Inter',sans-serif] font-bold text-[20px] text-[#fb035c]">
            $ {totals.sent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="backdrop-blur-[10px] bg-[#1c1c1c]/60 rounded-[16px] p-[16px] flex-1">
          <p className="font-['Inter',sans-serif] font-normal text-[14px] text-[#86909c] mb-[4px]">Total Received</p>
          <p className="font-['Inter',sans-serif] font-bold text-[20px] text-[#00ffa3]">
            $ {totals.received.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="backdrop-blur-[10px] bg-[#1c1c1c]/60 rounded-[16px] p-[16px] flex-1">
          <p className="font-['Inter',sans-serif] font-normal text-[14px] text-[#86909c] mb-[4px]">Contracts / Swaps</p>
          <p className="font-['Inter',sans-serif] font-bold text-[20px] text-[#00aaff]">
            $ {totals.swaps.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="backdrop-blur-[10px] bg-[#1c1c1c]/60 rounded-[16px] overflow-hidden">
        {/* Table header */}
        <div className="flex items-center px-[24px] py-[12px] border-b border-white/5">
          <div className="w-[50px] font-['Inter',sans-serif] text-[12px] text-[#86909c]">Type</div>
          <div className="w-[120px] font-['Inter',sans-serif] text-[12px] text-[#86909c]">Hash</div>
          <div className="flex-1 font-['Inter',sans-serif] text-[12px] text-[#86909c]">Asset</div>
          <div className="w-[150px] font-['Inter',sans-serif] text-[12px] text-[#86909c]">To / From</div>
          <div className="w-[140px] font-['Inter',sans-serif] text-[12px] text-[#86909c] text-right">Amount</div>
          <div className="w-[120px] font-['Inter',sans-serif] text-[12px] text-[#86909c] text-right">USD Value</div>
          <div className="w-[140px] font-['Inter',sans-serif] text-[12px] text-[#86909c] text-right">Date</div>
          <div className="w-[100px] font-['Inter',sans-serif] text-[12px] text-[#86909c] text-right">Status</div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-[40px] gap-[8px]">
            <div className="w-[16px] h-[16px] border-2 border-[#0FC6C2] border-t-transparent rounded-full animate-spin" />
            <p className="font-['Inter',sans-serif] text-[14px] text-[#86909c]">Fetching transactions from Etherscan...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-[40px]">
            <p className="font-['Inter',sans-serif] text-[16px] text-[#86909c]">No transactions found</p>
          </div>
        ) : (
          filtered.map((tx) => (
            <a
              key={tx.hash + tx.asset + tx.timestamp}
              href={`https://etherscan.io/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-[24px] py-[14px] w-full border-b border-white/5 last:border-b-0 hover:bg-white/[0.04] cursor-pointer transition-colors text-left no-underline"
            >
              <div className="w-[50px]">
                <div className={`size-[32px] rounded-full flex items-center justify-center text-[14px] ${getTypeBg(tx.type)}`}>
                  {getTypeIcon(tx.type)}
                </div>
              </div>
              <div className="w-[120px] font-['Inter',sans-serif] font-medium text-[14px] text-white/60 truncate" title={tx.hash}>
                {tx.hash.slice(0, 8)}...{tx.hash.slice(-4)}
              </div>
              <div className="flex-1 font-['Inter',sans-serif] font-semibold text-[14px] text-white">{tx.asset}</div>
              <div className="w-[150px] font-['Inter',sans-serif] font-normal text-[14px] text-white/60">{tx.to}</div>
              <div className="w-[140px] font-['Inter',sans-serif] font-semibold text-[14px] text-white text-right">{tx.amount}</div>
              <div className="w-[120px] font-['Inter',sans-serif] font-normal text-[14px] text-[#86909c] text-right">{tx.usd}</div>
              <div className="w-[140px] font-['Inter',sans-serif] font-normal text-[12px] text-[#86909c] text-right">
                <div>{tx.date}</div>
                <div>{tx.time}</div>
              </div>
              <div className="w-[100px] text-right">
                <span className={`inline-block px-[8px] py-[2px] rounded-[6px] font-['Inter',sans-serif] text-[12px] capitalize ${getStatusStyle(tx.status)}`}>
                  {tx.status}
                </span>
              </div>
            </a>
          ))
        )}

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-between px-[24px] py-[10px] border-t border-white/5">
            <div className="flex items-center gap-[6px]">
              <div className={`w-[5px] h-[5px] rounded-full ${isLive ? "bg-[#00ffa3] animate-pulse" : "bg-[#ffaa00]"}`} />
              <p className="font-['Inter',sans-serif] text-[10px] text-[#86909c]">
                {isLive ? "Live via Etherscan · Click any row to view on Etherscan" : "Using cached mock data · Etherscan may be rate-limited"}
              </p>
            </div>
            <p className="font-['Inter',sans-serif] text-[11px] text-[#86909c]">
              {filtered.length} of {transactions.length} transactions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
