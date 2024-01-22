import { Service } from 'egg';
import { MaxUint256 } from '../constants/common';
import { BigNumber } from 'bignumber.js';
export default class ApproveService extends Service {

  public async checkAndApprove(chain:string, phrase:string, contract:string, spender:string,sellAmount:string,sellDecimal:number) {
    const { service } = this;
    if(!contract){
      return 1;
    }else{
      const wallet = service.contractService.getWallet(phrase, chain);
      const erc20Contract = service.contractService.getErc20Contract(chain, contract);
      const provider = service.contractService.getProvider(chain);
      const allowance = await erc20Contract.allowance(wallet.address, spender);
      if (BigNumber(allowance.toString()).isLessThan( BigNumber(sellAmount).times(10 ** sellDecimal))) {
        console.log('approving...');
        await erc20Contract.estimateGas.approve(
          spender, MaxUint256, { from: wallet.address },
        );
        let approveTx = {
          to: contract,
          data: erc20Contract.interface.encodeFunctionData('approve', [ spender, MaxUint256 ]),
        };
        const feeData = await provider.getFeeData();
        if(chain === 'BSC'){
          approveTx =  {
            ...approveTx,
            ...{gasPrice:feeData.gasPrice}
          }
        }
        const approveResponse = await wallet.sendTransaction(approveTx);
        const receipt = await provider.waitForTransaction(approveResponse.hash);
        if (receipt?.blockNumber) {
          console.log('blockNumber:', receipt.blockNumber);
          return receipt.blockNumber;
        }
        return 0;
      }
      console.log('approved');
    }
   
    return 1;

  }
}
