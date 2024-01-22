import { BigNumberish, ethers } from 'ethers';
export function fromReadableAmount(
  amount: number,
  decimals: number,
): BigNumberish {
  return ethers.utils.parseUnits(amount.toString(), decimals);
}
