import { Controller } from 'egg';
import { CODE_MAP, MSG_MAP } from '../constants/code';
export type SwapParams = {
  senderAddress: string;
  recipientAddress: string;
  sellAsset: string;
  buyAsset: string;
  sellAmount: string;
  buyDecimal: number;
  sellDecimal: number;
  slippage: string;
  phrase: string;
  privateKey?: string;
  amm?: string;
  needProtect?:boolean;
  feeOnTransfer?:boolean;
};
export default class BuildTxController extends Controller {
  public async index() {
    const { ctx, service, app, logger } = this;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const errors = app.validator.validate(
      {
        senderAddress: 'string',
        recipientAddress: 'string',
        sellAsset: 'string',
        sellAmount: 'string',
        buyDecimal: 'number',
        sellDecimal: 'number',
        buyAsset: 'string',
        slippage: 'string',
        phrase: 'string',
      },
      ctx.request.body,
    );
    if (errors) {
      ctx.status = CODE_MAP.params;
      ctx.body = {
        code: CODE_MAP.params,
        msg: MSG_MAP[CODE_MAP.params],
        data: errors,
      };
      return ctx.body;
    }
    let res: any;
    if (
      ctx.request.body.amm === 'uniswapv2' ||
      ctx.request.body.amm === 'cakev2'
    ) {
      res = await service.buildTxServiceV2.swap(ctx.request.body);
    } else {
      res = await service.buildTxService.swap(ctx.request.body);
    }

    if (!res.tx) {
      ctx.body = {
        code: CODE_MAP.fail,
        data: null,
        msg: res,
      };
      return;
    }
    logger.info('swap msg:', res);
    ctx.body = {
      code: CODE_MAP.success,
      data: res,
      msg: MSG_MAP[CODE_MAP.success],
    };
    return ctx.body;
  }
}
