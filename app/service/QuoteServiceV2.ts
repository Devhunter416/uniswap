import { Service } from "egg";
import { QuoteParams } from "../controller/Quote";
import { getContractByChain } from "../constants/contracts";

import {
  Fetcher,
  Token,
  Route,
  Trade,
  TokenAmount,
  Percent,
} from "@uniswap/sdk";
import {
  Fetcher as PancakeFetcher,
  Route as PancakeRoute,
  Token as PancakeToken,
  WBNB,
  Trade as PancakeTrade,
  CurrencyAmount,
  Percent as PancakePercent,
} from "@pancakeswap/sdk";
import { WETH } from "app/constants/common";
import { BigNumber } from "bignumber.js";
import { TradeType } from "@uniswap/sdk-core";
import { fromReadableAmount } from "../utils/common";
// interface PoolInfo {
//   token0: string;
//   token1: string;
//   reserve0:string;
//   reserve1:string;
// }

export interface QuoteResponse {
  expectedOutput: string;
  expectedOutputMaxSlippage: string;
  gasAmount?: string;
  fees?: { [x: string]: string };
}

BigNumber.config({ EXPONENTIAL_AT: [-20, 10000] });
export default class QuoteServiceV2 extends Service {
  public async getQuote(quoteParams: QuoteParams): Promise<QuoteResponse> {
    let { sellAsset, buyAsset, sellAmount, slippage, sellDecimal, buyDecimal } =
      quoteParams;
    const sellChain = sellAsset?.split(".")[0];
    const sellInfo = getContractByChain(sellChain);
    sellAmount = new BigNumber(sellAmount).toFixed(sellDecimal);

    if (sellInfo) {
      const trade = await this.createTrade(
        sellAsset,
        sellDecimal,
        buyAsset,
        buyDecimal,
        sellAmount
      );
      const expectedOutput = trade?.outputAmount.toExact();
      const expectedOutputMaxSlippage = trade
        ?.minimumAmountOut(
          sellChain === "BSC"
            ? new PancakePercent(Number(slippage) * 100, 10_000)
            : (new Percent(String(Number(slippage) * 100), "10000") as any)
        )
        .toExact();
      const provider = this.service.contractService.getProvider(sellChain);
      const feeData = await provider.getFeeData();
      const gas = new BigNumber(feeData?.gasPrice.toString()).times(160000).div(10 ** 18).toString();
      return {
        expectedOutput: expectedOutput || "0",
        expectedOutputMaxSlippage: expectedOutputMaxSlippage || "0",
        fees: {
          [`${sellInfo!.chain}.${sellInfo!.name}`]: gas,
        },
      };
    }
    return {
      expectedOutput: "0",
      expectedOutputMaxSlippage: "0",
    };
  }

  public async createTrade(
    sellAsset: string,
    sellDecimal: number,
    buyAsset: string,
    buyDecimal: number,
    sellAmount: string
  ) {
    const sellToken = this._initToken(sellAsset, sellDecimal);
    const buyToken = this._initToken(buyAsset, buyDecimal);
    const provider = this.service.contractService.getProvider(
      sellAsset.split(".")[0]
    );
    let pair: any | null;
    let swapRoute: any | null;
    try {
      if (sellAsset.split(".")[0] === "BSC") {
        pair = await PancakeFetcher.fetchPairData(sellToken, buyToken);
        swapRoute = new PancakeRoute([pair], sellToken, buyToken);
      } else {
        pair = await Fetcher.fetchPairData(sellToken, buyToken, provider);
        swapRoute = new Route([pair], sellToken, buyToken);
      }

      const trade = await this.getTrade(
        swapRoute,
        sellToken,
        sellAmount,
        sellDecimal
      );
      return trade;
    } catch (e) {
      console.log(e);
    }
  }
  public async getTrade(
    route: Route | any,
    sellToken: Token | any,
    sellAmount: string,
    sellDecimals: number
  ) {
    if (route?.chainId === 56) {
      const trade = new PancakeTrade(
        route,
        CurrencyAmount.fromRawAmount(
          sellToken,
          fromReadableAmount(new BigNumber(sellAmount).toString() as any, sellToken.decimals).toString()
        ),
        TradeType.EXACT_INPUT
      );
      return trade;
    } else {
      const trade = new Trade(
        route,
        new TokenAmount(
          sellToken,
          new BigNumber(sellAmount).times(10 ** sellDecimals).toString()
        ),
        TradeType.EXACT_INPUT
      );
      return trade;
    }
  }

  private _initToken(asset: string, decimals: number) {
    const network = asset.split(".")[0];
    const symbol = asset.split(".")[1].split("-")[0];
    const contract = asset.split("-")?.[1];
    if (network === "BSC") {
      if (!contract) {
        return WBNB[56];
      }
      return new PancakeToken(
        56,
        contract.toLocaleLowerCase(),
        decimals,
        symbol
      );
    } else {
      if (!contract) {
        return WETH[network === "ETH" ? 1 : 56];
      }
      return new Token(
        network === "ETH" ? 1 : (56 as any),
        contract.toLocaleLowerCase(),
        decimals,
        symbol
      );
    }
  }
}
