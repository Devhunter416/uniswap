import { Application } from 'egg';

export default (app: Application) => {
  const { router, controller } = app;
  router.get('/api/uniswap/quote', controller.quote.index);
  router.post('/api/uniswap/swap', controller.swap.index);
  router.get('/api/uniswap/tx_detail', controller.txDetail.index);
  router.get('/api/uniswap/audit', controller.audit.index);
  router.post('/api/uniswap/buildTx', controller.buildTx.index);
};
