/**
 * Multi-provider blockchain API service with fallback logic
 * Primary: Moralis
 * Secondary: Alchemy
 * Tertiary: Etherscan
 * Fallback: CoinGecko (for price data only)
 */

const MORALIS_API_KEY = import.meta.env.VITE_MORALIS_API_KEY;
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

interface TokenData {
  symbol: string;
  name: string;
  price?: number;
  priceChange24h?: number;
  marketCap?: number;
  volume24h?: number;
  contractAddress?: string;
}

interface BalanceData {
  address: string;
  balance: string;
  balanceUSD?: number;
}

// MORALIS API
async function getMoralisTokenData(contractAddress: string): Promise<TokenData | null> {
  try {
    if (!MORALIS_API_KEY) return null;

    const response = await fetch(
      `https://deep-index.moralis.io/api/v2.2/erc20/${contractAddress}/metadata?chain=eth`,
      {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': MORALIS_API_KEY,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      symbol: data.symbol || '',
      name: data.name || '',
      contractAddress: data.address,
    };
  } catch (error) {
    console.error('[Moralis] Token data fetch failed:', error);
    return null;
  }
}

async function getMoralisBalance(address: string): Promise<BalanceData | null> {
  try {
    if (!MORALIS_API_KEY) return null;

    const response = await fetch(
      `https://deep-index.moralis.io/api/v2.2/${address}/balance?chain=eth`,
      {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': MORALIS_API_KEY,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      address,
      balance: data.balance || '0',
    };
  } catch (error) {
    console.error('[Moralis] Balance fetch failed:', error);
    return null;
  }
}

// ALCHEMY API
async function getAlchemyTokenData(contractAddress: string): Promise<TokenData | null> {
  try {
    if (!ALCHEMY_API_KEY) return null;

    const response = await fetch(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getTokenMetadata',
          params: [contractAddress],
          id: 1,
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.result) {
      return {
        symbol: data.result.symbol || '',
        name: data.result.name || '',
        contractAddress: contractAddress,
      };
    }
    return null;
  } catch (error) {
    console.error('[Alchemy] Token data fetch failed:', error);
    return null;
  }
}

async function getAlchemyBalance(address: string): Promise<BalanceData | null> {
  try {
    if (!ALCHEMY_API_KEY) return null;

    const response = await fetch(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.result) {
      return {
        address,
        balance: data.result,
      };
    }
    return null;
  } catch (error) {
    console.error('[Alchemy] Balance fetch failed:', error);
    return null;
  }
}

// ETHERSCAN API
async function getEtherscanTokenData(contractAddress: string): Promise<TokenData | null> {
  try {
    if (!ETHERSCAN_API_KEY) return null;

    const response = await fetch(
      `https://api.etherscan.io/api?module=token&action=tokeninfo&contractaddress=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === '1' && data.result) {
      return {
        symbol: data.result[0].symbol || '',
        name: data.result[0].name || '',
        contractAddress: contractAddress,
      };
    }
    return null;
  } catch (error) {
    console.error('[Etherscan] Token data fetch failed:', error);
    return null;
  }
}

async function getEtherscanBalance(address: string): Promise<BalanceData | null> {
  try {
    if (!ETHERSCAN_API_KEY) return null;

    const response = await fetch(
      `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === '1') {
      return {
        address,
        balance: data.result || '0',
      };
    }
    return null;
  } catch (error) {
    console.error('[Etherscan] Balance fetch failed:', error);
    return null;
  }
}

// COINGECKO API (Price Fallback)
async function getCoinGeckoPrice(tokenId: string): Promise<{ price?: number; change24h?: number } | null> {
  try {
    const response = await fetch(
      `/api/coingecko/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data[tokenId]) {
      return {
        price: data[tokenId].usd,
        change24h: data[tokenId].usd_24h_change,
      };
    }
    return null;
  } catch (error) {
    console.error('[CoinGecko] Price fetch failed:', error);
    return null;
  }
}

// FALLBACK CHAIN LOGIC
export async function getTokenData(contractAddress: string): Promise<TokenData> {
  // Try providers in order
  let result = await getMoralisTokenData(contractAddress);
  if (result) {
    console.log('[API] Using Moralis for token data');
    return result;
  }

  result = await getAlchemyTokenData(contractAddress);
  if (result) {
    console.log('[API] Using Alchemy for token data');
    return result;
  }

  result = await getEtherscanTokenData(contractAddress);
  if (result) {
    console.log('[API] Using Etherscan for token data');
    return result;
  }

  console.warn('[API] All providers failed for token data');
  return { symbol: 'UNKNOWN', name: 'Unknown Token', contractAddress };
}

export async function getBalance(address: string): Promise<BalanceData> {
  // Try providers in order
  let result = await getMoralisBalance(address);
  if (result) {
    console.log('[API] Using Moralis for balance');
    return result;
  }

  result = await getAlchemyBalance(address);
  if (result) {
    console.log('[API] Using Alchemy for balance');
    return result;
  }

  result = await getEtherscanBalance(address);
  if (result) {
    console.log('[API] Using Etherscan for balance');
    return result;
  }

  console.warn('[API] All providers failed for balance');
  return { address, balance: '0' };
}

export async function getTokenPrice(tokenId: string = 'ethereum'): Promise<{ price?: number; change24h?: number }> {
  const result = await getCoinGeckoPrice(tokenId);
  if (result) {
    console.log('[API] CoinGecko price data retrieved');
    return result;
  }

  console.warn('[API] CoinGecko price fetch failed');
  return {};
}

// Multi-token price fetch
export async function getMultipleTokenPrices(tokenIds: string[]): Promise<Record<string, { price?: number; change24h?: number }>> {
  try {
    const idsParam = tokenIds.join(',');
    const response = await fetch(
      `/api/coingecko/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`
    );

    if (!response.ok) return {};

    const data = await response.json();
    const result: Record<string, { price?: number; change24h?: number }> = {};

    for (const tokenId of tokenIds) {
      if (data[tokenId]) {
        result[tokenId] = {
          price: data[tokenId].usd,
          change24h: data[tokenId].usd_24h_change,
        };
      }
    }

    return result;
  } catch (error) {
    console.error('[CoinGecko] Multiple tokens price fetch failed:', error);
    return {};
  }
}

export const BlockchainAPI = {
  getTokenData,
  getBalance,
  getTokenPrice,
  getMultipleTokenPrices,
};

export default BlockchainAPI;
