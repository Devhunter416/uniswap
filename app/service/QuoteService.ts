import { Service } from "egg";
import { QuoteParams } from "../controller/Quote";
import {
  ContractInfo,
  getContractByChain,
  QUOTER_CONTRACT_ADDRESS,
} from "../constants/contracts";
import { ethers } from "ethers";
import {
  computePoolAddress,
  FeeAmount,
  Pool,
  Route,
  SwapQuoter,
  Trade,
} from "@uniswap/v3-sdk";
import { BigNumber } from "bignumber.js";
import {
  Token,
  Currency,
  CurrencyAmount,
  TradeType,
  Percent,
  Ether,
} from "@uniswap/sdk-core";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { fromReadableAmount } from "../utils/common";
import JSBI from "jsbi";
interface PoolInfo {
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  sqrtPriceX96: ethers.BigNumberish;
  liquidity: ethers.BigNumberish;
  tick: number;
}

export interface QuoteResponse {
  expectedOutput: string;
  expectedOutputMaxSlippage: string;
  gasAmount?: string;
  fees?: { [x: string]: string };
}

BigNumber.config({ EXPONENTIAL_AT: [-20, 10000] });
export default class QuoteService extends Service {
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
        sellInfo,
        sellAmount
      );
      const expectedOutput = trade?.outputAmount.toExact();
      const expectedOutputMaxSlippage = trade
        ?.minimumAmountOut(new Percent(Number(slippage) * 100, 10_000))
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
    sellInfo: ContractInfo,
    sellAmount: string
  ) {
    const sellContract = sellAsset.split("-")[1];
    const buyContract = buyAsset.split("-")[1];
    const sellToken = this._initToken(sellAsset, sellDecimal);
    const buyToken = this._initToken(buyAsset, buyDecimal);
    const poolInfo = await this.getPoolInfo(sellToken, buyToken, sellInfo);
    try {
      const pool = new Pool(
        sellToken,
        buyToken,
        sellToken.chainId === 56 ? 2500 as any :FeeAmount.MEDIUM,
        poolInfo.sqrtPriceX96.toString(),
        poolInfo.liquidity.toString(),
        poolInfo.tick
      );
      const swapRoute = new Route([pool], sellToken, buyToken);
      const amountOut = await this.getOutputQuote(
        swapRoute,
        sellToken,
        new BigNumber(sellAmount).toString()
      );

      const uncheckedTrade = Trade.createUncheckedTrade({
        route: swapRoute,
        inputAmount: CurrencyAmount.fromRawAmount(
          sellContract ? sellToken : Ether.onChain(sellToken.chainId),
          fromReadableAmount(new BigNumber(sellAmount).toString() as any, sellToken.decimals).toString()
        ),
        outputAmount: CurrencyAmount.fromRawAmount(
          buyContract ? buyToken : Ether.onChain(buyToken.chainId),
          JSBI.BigInt(amountOut)
        ),
        tradeType: TradeType.EXACT_INPUT,
      });

      return uncheckedTrade;
    } catch (e) {
      console.log(e);
    }
  }
  public async getPoolInfo(
    sellToken: Token,
    buyToken: Token,
    sellInfo?: ContractInfo
  ): Promise<PoolInfo> {
    const currentPoolAddress = computePoolAddress({
      factoryAddress: sellToken.chainId === 56 ?"0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9": sellInfo?.factoryContractV3 || "",
      tokenA: sellToken,
      tokenB: buyToken,
      fee: sellToken.chainId === 56 ? 2500 as any :FeeAmount.MEDIUM,
      initCodeHashManualOverride:sellInfo?.incodeHashV3
    });

    const poolContract = new ethers.Contract(
      currentPoolAddress,
      IUniswapV3PoolABI.abi,
      this.service.contractService.getProvider(sellInfo?.chain || "ETH")
    );

    const [token0, token1, fee, tickSpacing, liquidity, slot0] =
      await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.tickSpacing(),
        poolContract.liquidity(),
        poolContract.slot0(),
      ]);

    return {
      token0,
      token1,
      fee,
      tickSpacing,
      liquidity,
      sqrtPriceX96: slot0[0],
      tick: slot0[1],
    };
  }
  public async getOutputQuote(
    route: Route<Currency, Currency>,
    sellToken: Token,
    sellAmount: string
  ) {
    const provider = this.service.contractService.getProvider(
      route.chainId === 1 ? "ETH" : "BSC"
    );

    if (!provider) {
      throw new Error("Provider required to get pool state");
    }
    const { calldata } = await SwapQuoter.quoteCallParameters(
      route,
      CurrencyAmount.fromRawAmount(
        sellToken,
        fromReadableAmount(sellAmount as any, sellToken.decimals).toString()
      ),
      TradeType.EXACT_INPUT,
      {
        useQuoterV2: true,
      }
    );

    const quoteCallReturnData = await provider.call({
      to: QUOTER_CONTRACT_ADDRESS[route.chainId],
      data: calldata,
    });

    return ethers.utils.defaultAbiCoder.decode(
      ["uint256"],
      quoteCallReturnData
    );
  }

  private _initToken(asset: string, decimals: number) {
    const network = asset.split(".")[0];
    const symbol = asset.split(".")[1].split("-")[0];
    const contract = asset.split("-")?.[1];
    if (!contract) {
      return Ether.onChain(network === "ETH" ? 1 : 56).wrapped;
    }
    return new Token(network === "ETH" ? 1 : 56, contract.toLocaleLowerCase(), decimals, symbol);
  }
}
