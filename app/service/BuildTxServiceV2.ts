import { Service } from "egg";
import { SwapParams } from "../controller/Swap";
import {
  ContractInfo,
  getContractByChain,
  ROUTER_CONTRACT_V2,
} from "../constants/contracts";
import { TradeOptions, Percent } from "@uniswap/sdk";
import BigNumber from "bignumber.js";
const abi = require("@ethersproject/abi");
import { RouterV2Abi__factory } from "../abi/types";
import { Trade, TradeType } from "@uniswap/sdk";
import { Percent as PancakePercent } from "@pancakeswap/sdk";
import { WETH, ZERO_HEX } from "app/constants/common";
import invariant from "tiny-invariant";
export default class BuildTxServiceV2 extends Service {
  public async swap(params: SwapParams) {
    const { service, logger } = this;
    let {
      senderAddress,
      recipientAddress,
      sellAsset,
      buyAsset,
      sellDecimal,
      sellAmount,
      slippage,
      phrase,
      buyDecimal,
      feeOnTransfer,
    }: SwapParams = params;
    const sellChain = sellAsset?.split(".")[0];
    const sellContract = sellAsset?.split("-")[1];
    const sellInfo = getContractByChain(sellChain);
    sellAmount = new BigNumber(sellAmount).toFixed(sellDecimal);

    const wallet = service.contractService.getWallet(phrase, sellChain);
    if (!sellInfo) {
      return null;
    }
    try {
      const approveBlockNum = await service.approveService.checkAndApprove(
        sellChain,
        phrase,
        sellContract,
        ROUTER_CONTRACT_V2[sellInfo.networkID],
        sellAmount,
        sellDecimal
      );
      if (approveBlockNum > 0) {
        const trade: Trade = await this.service.quoteServiceV2.createTrade(
          sellAsset,
          sellDecimal,
          buyAsset,
          buyDecimal,
          sellAmount
        );

        const { tx, gasLimit } = await this.prepareTx(
          wallet,
          trade,
          sellChain,
          slippage,
          recipientAddress,
          sellInfo,
          senderAddress,
          feeOnTransfer
        );
        return {
            tx,
            gasLimit
        }
      }
      return null;
    } catch (e:any) {
      logger.error(e);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return e?.reason;
    }
  }
  public async prepareTx(
    provider: any,
    trade: any,
    sellChain: string,
    slippage: string,
    recipientAddress: string,
    sellInfo: ContractInfo,
    senderAddress: string,
    feeOnTransfer?: boolean
  ) {
    const interfaces = new abi.Interface(RouterV2Abi__factory.abi);
    const options: TradeOptions = {
      allowedSlippage:
        sellChain === "BSC"
          ? new PancakePercent(Number(slippage) * 100, 10_000)
          : (new Percent(String(Number(slippage) * 100), "10000") as any), // 50 bips, or 0.50%
      ttl: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
      recipient: recipientAddress,
      feeOnTransfer,
    };
    const methodParameters = this.swapCallParameters(trade, options, sellChain);
    let tx: any = {
      data: interfaces.encodeFunctionData(
        methodParameters.methodName,
        methodParameters.args
      ),
      to: ROUTER_CONTRACT_V2[sellInfo.networkID],
      value: methodParameters.value,
      from: senderAddress,
    };
    const feeData = await provider.getFeeData();

    const gasLimit = await provider.estimateGas(tx);
    if (sellChain === "BSC") {
      tx = {
        ...tx,
        ...{ gasPrice: feeData.gasPrice },
      };
    }
    return { gasLimit, tx };
  }
  swapCallParameters(trade: any, options: any, chain: string) {
    var etherIn =
      trade.inputAmount.currency?.address === WETH[trade.route.chainId].address;
    var etherOut =
      trade.outputAmount.currency.address === WETH[trade.route.chainId].address; // the router does not support both ether in and out

    !!(etherIn && etherOut) ? invariant(false, "ETHER_IN_OUT") : void 0;
    !(!("ttl" in options) || options.ttl > 0)
      ? invariant(false, "TTL")
      : void 0;
    var to = options.recipient;
    var amountIn = this.toHex(
      trade.maximumAmountIn(options.allowedSlippage),
      chain
    );
    var amountOut = this.toHex(
      trade.minimumAmountOut(options.allowedSlippage),
      chain
    );
    var path = trade.route.path.map(function (token) {
      return token.address;
    });
    var deadline =
      "ttl" in options
        ? "0x" +
          (Math.floor(new Date().getTime() / 1000) + options.ttl).toString(16)
        : "0x" + options.deadline.toString(16);
    var useFeeOnTransfer = Boolean(options.feeOnTransfer);
    var methodName;
    var args;
    var value;

    switch (trade.tradeType) {
      case TradeType.EXACT_INPUT:
        if (etherIn) {
          methodName = useFeeOnTransfer
            ? "swapExactETHForTokensSupportingFeeOnTransferTokens"
            : "swapExactETHForTokens"; // (uint amountOutMin, address[] calldata path, address to, uint deadline)

          args = [amountOut, path, to, deadline];
          value = amountIn;
        } else if (etherOut) {
          methodName = useFeeOnTransfer
            ? "swapExactTokensForETHSupportingFeeOnTransferTokens"
            : "swapExactTokensForETH"; // (uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)

          args = [amountIn, amountOut, path, to, deadline];
          value = ZERO_HEX;
        } else {
          methodName = useFeeOnTransfer
            ? "swapExactTokensForTokensSupportingFeeOnTransferTokens"
            : "swapExactTokensForTokens"; // (uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)

          args = [amountIn, amountOut, path, to, deadline];
          value = ZERO_HEX;
        }

        break;

      case TradeType.EXACT_OUTPUT:
        !!useFeeOnTransfer ? invariant(false, "EXACT_OUT_FOT") : void 0;

        if (etherIn) {
          methodName = "swapETHForExactTokens"; // (uint amountOut, address[] calldata path, address to, uint deadline)

          args = [amountOut, path, to, deadline];
          value = amountIn;
        } else if (etherOut) {
          methodName = "swapTokensForExactETH"; // (uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)

          args = [amountOut, amountIn, path, to, deadline];
          value = ZERO_HEX;
        } else {
          methodName = "swapTokensForExactTokens"; // (uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)

          args = [amountOut, amountIn, path, to, deadline];
          value = ZERO_HEX;
        }

        break;
    }

    return {
      methodName: methodName,
      args: args,
      value: value,
    };
  }
  toHex(currencyAmount, chain: string) {
    if (chain === "BSC") {
      return `0x${currencyAmount.quotient.toString(16)}`;
    } else {
      return "0x" + currencyAmount.raw.toString(16);
    }
  }
}
