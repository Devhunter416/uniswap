export const POOLS = [
  {
    name: 'USDC',
    id: 1,
    starGateChainID: 101,
    chain: 'ETH',
  },
  {
    name: 'USDT',
    id: 2,
    starGateChainID: 101,
    chain: 'ETH',
  },
  {
    name: 'DAI',
    id: 3,
    starGateChainID: 101,
    chain: 'ETH',
  },
  {
    name: 'ETH',
    id: 13,
    starGateChainID: 101,
    chain: 'ETH',
  },
  {
    name: 'USDT',
    id: 2,
    starGateChainID: 102,
    chain: 'BSC',
  },
  {
    name: 'BUSD',
    id: 5,
    starGateChainID: 102,
    chain: 'BSC',
  },
  {
    name: 'USDC',
    id: 1,
    starGateChainID: 109,
    chain: 'POLYGON',
  },
  {
    name: 'USDT',
    id: 2,
    starGateChainID: 109,
    chain: 'POLYGON',
  },
  {
    name: 'DAI',
    id: 2,
    starGateChainID: 109,
    chain: 'POLYGON',
  },
  {
    name: 'USDC',
    id: 1,
    starGateChainID: 110,
    chain: 'ARBITRUM',
  },
  {
    name: 'USDT',
    id: 2,
    starGateChainID: 110,
    chain: 'ARBITRUM',
  },
  {
    name: 'USDC',
    id: 1,
    starGateChainID: 111,
    chain: 'OPTIMISM',
  },
  {
    name: 'DAI',
    id: 3,
    starGateChainID: 111,
    chain: 'OPTIMISM',
  },
  {
    name: 'USDC',
    id: 1,
    starGateChainID: 184,
    chain: 'BASE',
  },
];

export const getPoolBuyChainName = (chain: string, name: string) => {
  const pool = POOLS.filter(i => i.chain === chain && name === i.name);
  if (pool?.length > 0) {
    return pool[0];
  }
  return null;
};
