import { BigNumberish, BigNumber } from "ethers";
import { Token } from "@uniswap/sdk";
export const MaxUint256: BigNumberish = /* #__PURE__*/ BigNumber.from(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);
export const MAX_FEE_PER_GAS = 100000000000;
export const MAX_PRIORITY_FEE_PER_GAS = 100000000000;
export const ZERO_HEX = '0x0';
var _WETH;
export const WETH =
  ((_WETH = {}),
  (_WETH[1] = /*#__PURE__*/ new Token(
    1,
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    18,
    "WETH",
    "Wrapped Ether"
  )),
  (_WETH[56] = /*#__PURE__*/ new Token(
    56 as any,
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    18,
    "WBNB",
    "Wrapped BNB"
  )),
  _WETH);
