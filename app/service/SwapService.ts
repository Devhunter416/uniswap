import { Service } from "egg";
import { SwapParams } from "../controller/Swap";
import {
  ContractInfo,
  getContractByChain,
  ROUTER_CONTRACT_V3,
} from "../constants/contracts";
import {
  encodeRouteToPath,
  SwapOptions,
  SwapRouter,
} from "@uniswap/v3-sdk";
import { SelfPermit,Payments as PancakePayment,Multicall} from "@pancakeswap/v3-sdk";
const abi = require("@ethersproject/abi");
import { CurrencyAmount, Percent, TradeType } from "@uniswap/sdk-core";
import BigNumber from "bignumber.js";
import invariant from "tiny-invariant";
import { PancakeSwapouter__factory } from "../abi/types";
import { validateAndParseAddress } from "@pancakeswap/sdk";
import { BigNumber as EBignumber } from "ethers";
export default class SwapService extends Service {
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
      needProtect,
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
        ROUTER_CONTRACT_V3[sellInfo.networkID],
        sellAmount,
        sellDecimal
      );
      if (approveBlockNum > 0) {
        const trade: any = await this.service.quoteService.createTrade(
          sellAsset,
          sellDecimal,
          buyAsset,
          buyDecimal,
          sellInfo,
          sellAmount
        );

        const { tx, gasLiimt } = await this.prepareTx(
          wallet,
          trade,
          sellChain,
          slippage,
          recipientAddress,
          sellInfo,
          senderAddress
        );
        if (needProtect) {
          const provider = this.service.contractService.getProvider(sellChain);
          const feeData = await provider.getFeeData();
          const tx2 = {
            ...tx,
            ...{
              chainId: sellInfo.networkID,
              gasPrice: EBignumber.from(
                new BigNumber(feeData.gasPrice.toString()).times(1.1).toFixed(0)
              ).toHexString(),
              gasLimit: EBignumber.from(
                new BigNumber(gasLiimt.toString()).times(1.1).toFixed(0)
              ).toHexString(),
            },
          };
          const response =
            await this.service.privateTransactionService.sendBundleTransaction(
              provider,
              wallet,
              tx2
            );
          return { hash: response.bundleTransactions[0]?.hash };
        }
        const response = await wallet.sendTransaction(tx);
        return response;
      }
      return null;
    } catch (e) {
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
    senderAddress: string
  ) {
    const options: SwapOptions = {
      slippageTolerance: new Percent(Number(slippage) * 100, 10_000), // 50 bips, or 0.50%
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
      recipient: recipientAddress,
    };
    let methodParameters: any;
    if (sellChain === "BSC") {
      methodParameters = this.swapCallParameters([trade], options as any);
    } else {
      methodParameters = SwapRouter.swapCallParameters([trade], options);
    }
    
    let tx = {
      data: methodParameters.calldata,
      to: ROUTER_CONTRACT_V3[sellInfo.networkID],
      value: methodParameters.value,
      from: senderAddress,
    };
    console.log(tx);
    const feeData = await provider.getFeeData();
    const gasLiimt = await provider.estimateGas(tx);

    if(sellChain === 'BSC'){
      tx =  {
        ...tx,
        ...{gasPrice:feeData.gasPrice}
      }
    }
  
    return { gasLiimt, tx };
  }
  public swapCallParameters(trades: any, options: any) {
    if (!Array.isArray(trades)) {
      trades = [trades];
    }
    const interfaces: any = new abi.Interface(PancakeSwapouter__factory.abi);
    const sampleTrade = trades[0];
    const tokenIn = sampleTrade.inputAmount.currency.wrapped;
    const tokenOut = sampleTrade.outputAmount.currency.wrapped; // All trades should have the same starting and ending token.

    !trades.every(function (trade) {
      return trade.inputAmount.currency.wrapped.equals(tokenIn);
    })
      ? invariant(false, "TOKEN_IN_DIFF")
      : void 0;
    !trades.every(function (trade) {
      return trade.outputAmount.currency.wrapped.equals(tokenOut);
    })
      ? invariant(false, "TOKEN_OUT_DIFF")
      : void 0;
    const calldatas = [];
    const ZERO_IN = CurrencyAmount.fromRawAmount(
      trades[0].inputAmount.currency,
      0
    );
    const ZERO_OUT = CurrencyAmount.fromRawAmount(
      trades[0].outputAmount.currency,
      0
    );
    const totalAmountOut = trades.reduce(function (sum, trade) {
      return sum.add(trade.minimumAmountOut(options.slippageTolerance));
    }, ZERO_OUT); // flag for whether a refund needs to happen

    const mustRefund =
      sampleTrade.inputAmount.currency.isNative &&
      sampleTrade.tradeType === TradeType.EXACT_OUTPUT;
    const inputIsNative = sampleTrade.inputAmount.currency.isNative; // flags for whether funds should be send first to the router

    const outputIsNative = sampleTrade.outputAmount.currency.isNative;
    const routerMustCustody = outputIsNative || !!options.fee;
    const totalValue = inputIsNative
      ? trades.reduce(function (sum, trade) {
          return sum.add(trade.maximumAmountIn(options.slippageTolerance));
        }, ZERO_IN)
      : ZERO_IN; // encode permit if necessary

    if (options.inputTokenPermit) {
      !sampleTrade.inputAmount.currency.isToken
        ? invariant(false, "NON_TOKEN_PERMIT")
        : void 0;

      calldatas.push(
        // @ts-ignore
        SelfPermit.encodePermit(
          sampleTrade.inputAmount.currency,
          options.inputTokenPermit
        )
      );
    }

    const recipient = validateAndParseAddress(options.recipient);
    const deadline = BigInt(options.deadline);

    for (
      var _iterator = this._createForOfIteratorHelperLoose(trades), _step;
      !(_step = _iterator()).done;

    ) {
      const trade = _step.value;

      for (
        var _iterator2 = this._createForOfIteratorHelperLoose(trade.swaps),
          _step2;
        !(_step2 = _iterator2()).done;

      ) {
        const _step2$value = _step2.value,
          route = _step2$value.route,
          inputAmount = _step2$value.inputAmount,
          outputAmount = _step2$value.outputAmount;
        const amountIn = BigInt(
          trade.maximumAmountIn(options.slippageTolerance, inputAmount).quotient
        );
        const amountOut = BigInt(
          trade.minimumAmountOut(options.slippageTolerance, outputAmount)
            .quotient
        ); // flag for whether the trade is single hop or not
        console.log(amountIn);
        console.log(amountOut);
        const singleHop = route.pools.length === 1;

        if (singleHop) {
          if (trade.tradeType === TradeType.EXACT_INPUT) {
            var _options$sqrtPriceLim;

            const exactInputSingleParams = {
              tokenIn: route.tokenPath[0].address,
              tokenOut: route.tokenPath[1].address,
              fee: route.pools[0].fee,
              recipient: routerMustCustody ? ROUTER_CONTRACT_V3[56] : recipient,
              deadline,
              amountIn,
              amountOutMinimum: amountOut,
              sqrtPriceLimitX96: BigInt(
                (_options$sqrtPriceLim = options.sqrtPriceLimitX96) != null
                  ? _options$sqrtPriceLim
                  : 0
              ),
            };
            calldatas.push(
              // @ts-ignore
              interfaces.encodeFunctionData("exactInputSingle", [
                exactInputSingleParams,
              ])
            );
          } else {
            var _options$sqrtPriceLim2;

            const exactOutputSingleParams = {
              tokenIn: route.tokenPath[0].address,
              tokenOut: route.tokenPath[1].address,
              fee: route.pools[0].fee,
              recipient: routerMustCustody ? ROUTER_CONTRACT_V3[56] : recipient,
              deadline,
              amountOut,
              amountInMaximum: amountIn,
              sqrtPriceLimitX96: BigInt(
                (_options$sqrtPriceLim2 = options.sqrtPriceLimitX96) != null
                  ? _options$sqrtPriceLim2
                  : 0
              ),
            };
            calldatas.push(
              // @ts-ignore
              interfaces.encodeFunctionData("exactOutputSingle", [
                exactOutputSingleParams,
              ])
            );
          }
        } else {
          !(options.sqrtPriceLimitX96 === undefined)
            ? invariant(false, "MULTIHOP_PRICE_LIMIT")
            : void 0;
          const path = encodeRouteToPath(
            route,
            trade.tradeType === TradeType.EXACT_OUTPUT
          );

          if (trade.tradeType === TradeType.EXACT_INPUT) {
            const exactInputParams = {
              path,
              recipient: routerMustCustody ? ROUTER_CONTRACT_V3[56] : recipient,
              deadline,
              amountIn,
              amountOutMinimum: amountOut,
            };

            calldatas.push(
              // @ts-ignore
              interfaces.encodeFunctionData("exactInput", [exactInputParams])
            );
          } else {
            const exactOutputParams = {
              path,
              recipient: routerMustCustody ? ROUTER_CONTRACT_V3[56] : recipient,
              deadline,
              amountOut,
              amountInMaximum: amountIn,
            };

            calldatas.push(
              // @ts-ignore
              interfaces.encodeFunctionData("exactOutput", [exactOutputParams])
            );
          }
        }
      }
    } // unwrap

    if (routerMustCustody) {
      if (options.fee) {
        if (outputIsNative) {
          calldatas.push(
            // @ts-ignore
            PancakePayment.encodeUnwrapWETH9(
              totalAmountOut.quotient,
              recipient,
              options.fee
            )
          );
        } else {
          calldatas.push(
            // @ts-ignore
            PancakePayment.encodeSweepToken(
              sampleTrade.outputAmount.currency.wrapped,
              totalAmountOut.quotient,
              recipient,
              options.fee
            )
          );
        }
      } else {
        console.log(totalAmountOut.quotient.toString());
        calldatas.push(
          // @ts-ignore
          PancakePayment.encodeUnwrapWETH9(totalAmountOut.quotient, recipient)
        );
      }
    } // refund

    if (mustRefund) {
      // @ts-ignore
      calldatas.push(PancakePayment.encodeRefundETH());
    }

    return {
      calldata: Multicall.encodeMulticall(calldatas),
      value: BigInt(totalValue.quotient),
    };
  }

  _createForOfIteratorHelperLoose(o, allowArrayLike?: any) {
    let it;

    if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
      if (
        Array.isArray(o) ||
        (it = this._unsupportedIterableToArray(o)) ||
        (allowArrayLike && o && typeof o.length === "number")
      ) {
        if (it) o = it;
        let i = 0;
        return function () {
          if (i >= o.length) {
            return {
              done: true,
            };
          }
          return {
            done: false,
            value: o[i++],
          };
        };
      }

      throw new TypeError(
        "Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
      );
    }

    it = o[Symbol.iterator]();
    return it.next.bind(it);
  }
  _unsupportedIterableToArray(o, minLen?: any) {
    if (!o) return;
    if (typeof o === "string") return this._arrayLikeToArray(o, minLen);
    let n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (
      n === "Arguments" ||
      /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
    ) {
      return this._arrayLikeToArray(o, minLen);
    }
  }
  _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }
}
