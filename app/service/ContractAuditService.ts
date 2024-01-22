import { Service } from "egg";
import { GoPlus, ErrorCode } from "@goplus/sdk-node";
export default class ContractAuditService extends Service {
  async audit(chainID: string, asset: string) {
    const tokenInfo = await this.fetchTokenSafe(chainID, asset);
    for (const key in tokenInfo) {
        let i = tokenInfo[key];
        i.isAudit = true;
        if (!i?.is_open_source || i?.is_open_source === "0") {
           i.isAudit = false;
        }
        if (i?.is_proxy === "1") {
          i.isAudit = false;
        }
        if (i?.is_mintable === "1") {
          i.isAudit = false;
        }
        if (i?.owner_change_balance === "1") {
          i.isAudit = false;
        }
        if (i?.hidden_owner === "1") {
          i.isAudit = false;
        }
        if (i?.selfdestruct === "1") {
          i.isAudit = false;
        }
        if (i?.external_call === "1") {
          i.isAudit = false;
        }
        if (i?.gas_abuse === "1") {
          i.isAudit = false;
        }
        if (i?.gas_abuse === "0") {
          i.isAudit = false;
        }
        if (i?.buy_tax !== "0") {
          i.isAudit = false;
        }
        if (i?.sell_tax !== "0") {
          i.isAudit = false;
        }
        if (i?.cannot_buy === "1") {
          i.isAudit = false;
        }
        if (i?.cannot_sell_all === "1") {
          i.isAudit = false;
        }
        if (i?.slippage_modifiable === "1") {
          i.isAudit = false;
        }
        if (i?.is_honeypot === "1") {
          i.isAudit = false;
        }
        if (i?.transfer_pausable === "1") {
          i.isAudit = false;
        }
        if (i?.is_blacklisted === "1") {
          i.isAudit = false;
        }
        if (i?.is_whitelisted === "1") {
          i.isAudit = false;
        }
        if (i?.is_anti_whale === "1") {
          i.isAudit = false;
        }
        if (i?.anti_whale_modifiable === "1") {
          i.isAudit = false;
        }
        if (i?.trading_cooldown === "1") {
          i.isAudit = false;
        }
        if (i?.personal_slippage_modifiable === "1") {
          i.isAudit = false;
        }
        if (i?.is_true_token === "0") {
          i.isAudit = false;
        }
        if (i?.is_airdrop_scam === "1") {
          i.isAudit = false;
        }
        return i
      };
  }

  async fetchTokenSafe(chainID: string, token: string) {
    const { logger } = this;
    try {
      let res = await GoPlus.tokenSecurity(chainID, [token], 30);
      if (res.code != ErrorCode.SUCCESS) {
        logger.error(res.message);
      }
      return res.result || null;
    } catch (e) {
      console.log(e);
    }
  }
}
