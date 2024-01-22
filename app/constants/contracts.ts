export interface ContractInfo {
  chain: string;
  networkID: number;
  routerContractV3: string;
  factoryContractV3:string;
  routerContractV2: string;
  factoryContractV2:string;
  rpcUrl: string;
  quoterContract: string;
  name: string;
  incodeHashV3:string;
  privateRpc:string;
}
export const ROUTER_CONTRACT_V3 = {
  1: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  56: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
};
export const ROUTER_CONTRACT_V2 = {
  1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  56: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
};
export const POOL_FACTORY_CONTRACT_ADDRESS_V3 = {
  1: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  56: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
};
export const POOL_FACTORY_CONTRACT_ADDRESS_V2 = {
  1: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  56: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
};
export const QUOTER_CONTRACT_ADDRESS = {
  1: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  56: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
};
export const CONTRACTS_INFO: ContractInfo[] = [
  {
    chain: 'ETH',
    networkID: 1,
    factoryContractV3: POOL_FACTORY_CONTRACT_ADDRESS_V3[1],
    routerContractV3: ROUTER_CONTRACT_V3[1],
    routerContractV2: ROUTER_CONTRACT_V2[1],
    factoryContractV2: ROUTER_CONTRACT_V2[1],
    quoterContract: QUOTER_CONTRACT_ADDRESS[1],
    rpcUrl:
      'https://eth-mainnet.nodereal.io/v1/246ad02a961f4c4badc0f50dd5bf0878',
    name: 'ETH',
    incodeHashV3:'0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
    privateRpc:'https://pancake-eth.rpc.blxrbdn.com'
  },
  {
    chain: 'BSC',
    networkID: 56,
    factoryContractV3: POOL_FACTORY_CONTRACT_ADDRESS_V3[56],
    routerContractV3: ROUTER_CONTRACT_V3[56],
    quoterContract: QUOTER_CONTRACT_ADDRESS[56],
    routerContractV2: ROUTER_CONTRACT_V2[56],
    factoryContractV2: ROUTER_CONTRACT_V2[56],
    rpcUrl: 'https://bsc-mainnet.nodereal.io/v1/d45a5575ca5249a4bd2c228e11e8aafe',
    name: 'BNB',
    incodeHashV3:'0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2',
    privateRpc:'https://pancake-bnb.rpc.blxrbdn.com'
  },
];

export const getContractByChain = (chain: string) => {
  const res = CONTRACTS_INFO.filter(i => i.chain === chain);
  if (res?.length > 0) {
    return res[0];
  }
};
