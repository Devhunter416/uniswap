import { Service } from "egg";

type TransactionDetailResponse = {
  status: string;
  inputAsset: string;
  inputAmount: string;
  outputAsset: string;
  outputAmount: string;
};
export default class TransactionService extends Service {
  async getTransactionDetail(
    chain: string,
    hash: string,
    receiveAddress: string,
  ): Promise<TransactionDetailResponse> {
    const { ctx, logger } = this;
    let detail: TransactionDetailResponse = {
      status: "pending",
      inputAmount: "",
      inputAsset: "",
      outputAmount: "",
      outputAsset: "",
    };
    try {
      const result = await ctx.curl(
        `http://127.0.0.1:8888/api/oneinch/tx_detail?txHash=${hash}&chainId=${chain}&receiveAddress=${receiveAddress}`,
        {
          // 请求配置参数
          method: "GET",
          dataType: "json",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      detail = { ...detail, ...result.data.data };
      return detail;
    } catch (e) {
      logger.error(e);
      return detail;
    }
  }
}
