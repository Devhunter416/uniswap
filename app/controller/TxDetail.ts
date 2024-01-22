import { Controller } from 'egg';
import { CODE_MAP, MSG_MAP } from '../constants/code';

export default class TxDetail extends Controller {
  public async index() {
    const { ctx, service, app } = this;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const errors = app.validator.validate(
      {
        txHash: 'string',
        chainId: 'string',
        receiveAddress: 'string',
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
    const txDetail = await service.transactionService.getTransactionDetail(ctx.query.chainId, ctx.query.txHash, ctx.query.receiveAddress,ctx.query.isProtect,ctx.query.pharse);
    ctx.body = {
      code: CODE_MAP.success,
      data: txDetail,
      msg: MSG_MAP[CODE_MAP.success],
    };
    return ctx.body;
  }
}
