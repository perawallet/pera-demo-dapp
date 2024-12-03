import {microalgosToAlgos, modelsv2} from "algosdk";

import {ChainType, clientForChain} from "../algod/algod";
import {formatNumber} from "../number/numberUtils";

function getAccountBalanceText(account: modelsv2.Account) {
  return `${formatNumber({minimumFractionDigits: 2})(
    microalgosToAlgos(Number(account.amount))
  )} ALGO`;
}

function getAccountInformation(chain: ChainType, address: string) {
  return new Promise<modelsv2.Account>((resolve, reject) => {
    try {
      resolve(
        clientForChain(chain)
          .accountInformation(address)
          .do() as Promise<modelsv2.Account>
      );
    } catch (error) {
      reject(error);
    }
  });
}

export {getAccountBalanceText, getAccountInformation};
