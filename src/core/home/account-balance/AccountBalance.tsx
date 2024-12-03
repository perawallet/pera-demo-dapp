import algosdk from "algosdk";
import {getAccountBalanceText} from "../../utils/account/accountUtils";
import {ChainType} from "../../utils/algod/algod";
import {getWalletDetailsFromStorage} from "../../utils/storage/storageUtils";
import {truncateAccountAddress} from "../../utils/string/stringUtils";

function AccountBalance({
  accountInformation,
  chain
}: {
  accountInformation: algosdk.modelsv2.Account;
  chain: ChainType;
}) {
  const walletDetails = getWalletDetailsFromStorage();

  return (
    <div>
      <div className={"app__account-address"}>
        <b className={"app__text-purple"}>{"Connected to: "}</b>

        {truncateAccountAddress(accountInformation.address)}
      </div>

      <div className={"app__account-address"}>
        <b className={"app__text-purple"}>{"Chain: "}</b>

        {chain.toUpperCase()}
      </div>

      <div className={"app__account-address"}>
        <b className={"app__text-purple"}>{"Wallet Type: "}</b>

        {walletDetails?.type}
      </div>

      {accountInformation && (
        <div className={"app__account-address"}>
          <b className={"app__text-purple"}>{"Balance: "}</b>

          {getAccountBalanceText(accountInformation)}
        </div>
      )}
    </div>
  );
}

export default AccountBalance;
