import { Controller } from 'egg';
import { CODE_MAP, MSG_MAP } from '../constants/code';
export interface AuditParams {
  chainID: string;
  token: string;
}
export default class AuditController extends Controller {
  public async index() {
    const { ctx, service, app } = this;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const errors = app.validator.validate(
      {
        chainID: 'string',
        token: 'string',
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
      const result = await service.contractAuditService.audit(ctx.query.chainID, ctx.query.token);
      ctx.body = {
        code: CODE_MAP.success,
        data: result,
        msg: MSG_MAP[CODE_MAP.success],
      };
    } catch (e: any) {
      ctx.body = {
        code: CODE_MAP.fail,
        data: null,
        msg: e?.reason,
      };
    }

    return ctx.body;
  }
}
