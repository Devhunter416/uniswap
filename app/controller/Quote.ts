import { Controller } from 'egg';
import { CODE_MAP, MSG_MAP } from '../constants/code';
export interface QuoteParams {
  sellAsset: string;
  buyAsset: string;
  buyDecimal: number;
  sellAmount: string;
  sellDecimal: number;
  slippage: string;
  amm?:'uniswapv2'| 'uniswapv3' | 'cakev2'| 'pancakev3'
}
export default class QuoteController extends Controller {
  public async index() {
    const { ctx, service, app } = this;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const errors = app.validator.validate(
      {
        sellAsset: 'string',
        sellAmount: 'string',
        buyDecimal: 'string',
        sellDecimal: 'string',
        buyAsset: 'string',
        slippage: 'string',
      },
      ctx.query,
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
    try {
      let result:any;
      if (ctx.query.amm === 'uniswapv2'||ctx.query.amm === 'cakev2') {
        result = await service.quoteServiceV2.getQuote({
          sellAsset: ctx.query.sellAsset,
          sellAmount: ctx.query.sellAmount,
          sellDecimal: Number(ctx.query.sellDecimal),
          buyAsset: ctx.query.buyAsset,
          buyDecimal: Number(ctx.query.buyDecimal),
          slippage: ctx.query.slippage,
        } as QuoteParams);
      } else {
        result = await service.quoteService.getQuote({
          sellAsset: ctx.query.sellAsset,
          sellAmount: ctx.query.sellAmount,
          sellDecimal: Number(ctx.query.sellDecimal),
          buyAsset: ctx.query.buyAsset,
          buyDecimal: Number(ctx.query.buyDecimal),
          slippage: ctx.query.slippage,
        } as QuoteParams);
      }
      ctx.body = {
        code: CODE_MAP.success,
        data: result,
        msg: MSG_MAP[CODE_MAP.success],
      };
    } catch (e:any) {
      ctx.body = {
        code: CODE_MAP.fail,
        data: null,
        msg: e?.reason,
      };
    }

    return ctx.body;
  }
}
