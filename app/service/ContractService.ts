import { Service } from 'egg';
import { Contract, ethers, providers } from 'ethers';
import ERC20Abi from '../abi/erc20.json';
import { getContractByChain } from '../constants/contracts';
import { Erc20 } from '../abi/types/Erc20';
export default class ContractService extends Service {
  public getProvider(chain:string) {
    const info = getContractByChain(chain);
    const providerUrl = info?.rpcUrl;
    const provider = new providers.JsonRpcProvider(providerUrl);
    return provider;
  }
  public getErc20Contract(chain: string, contract: string) {
    const provider = this.getProvider(chain);
    return new Contract(contract!, ERC20Abi, provider) as unknown as Erc20;
  }
  public getWallet(mnemonic: string, chain:string) {
    const provider = this.getProvider(chain);
    const w = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/0");
    const wallet = new ethers.Wallet(w.privateKey, provider);
    return wallet;
  }

}
