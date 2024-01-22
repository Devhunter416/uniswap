import { Service } from 'egg';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
export default class PrivateTransactionService extends Service {

  public async sendBundleTransaction(provider:any, wallet:any, transaction:any) {
    const flashbotsPovider = await FlashbotsBundleProvider.create(provider, wallet);
    const targetBlockNumber = (await provider.getBlockNumber()) + 5;
    const transactionBundle = [
      {
        signer: wallet, // ethers signer
        transaction, // ethers populated transaction object
      },
    ];
    const signedTransactions = await flashbotsPovider.signBundle(transactionBundle);
    try {
      await flashbotsPovider.simulate(signedTransactions, targetBlockNumber);

      const response = await flashbotsPovider.sendRawBundle(
        signedTransactions,
        targetBlockNumber,
      );
      return response;
    } catch (e) {
      console.log(e);
      this.logger.error(e);
      return e;
    }
  }
}
