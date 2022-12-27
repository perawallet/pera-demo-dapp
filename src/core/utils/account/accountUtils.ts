import {microalgosToAlgos} from "algosdk";

import {ChainType, clientForChain} from "../algod/algod";
import {formatNumber} from "../number/numberUtils";

function getAccountBalanceText(account: AccountInformationData) {
  return `${formatNumber({minimumFractionDigits: 2})(
    microalgosToAlgos(Number(account.amount))
  )} ALGO`;
}

function getAccountInformation(chain: ChainType, address: string) {
  return new Promise<AccountInformationData>((resolve, reject) => {
    try {
      resolve(
        clientForChain(chain)
          .accountInformation(address)
          .do() as Promise<AccountInformationData>
      );
    } catch (error) {
      reject(error);
    }
  });
}

export {getAccountBalanceText, getAccountInformation};
