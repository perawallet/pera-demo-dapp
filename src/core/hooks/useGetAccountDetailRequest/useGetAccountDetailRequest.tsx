import {useToaster} from "@hipo/react-ui-toolkit";
import {useCallback, useEffect, useState} from "react";

import PeraToast from "../../component/toast/PeraToast";
import {getAccountInformation} from "../../utils/account/accountUtils";
import {ChainType} from "../../utils/algod/algod";
import algosdk from "algosdk";

function useGetAccountDetailRequest({
  chain,
  accountAddress
}: {
  chain: ChainType;
  accountAddress: string | null;
}) {
  const [accountInformation, setAccountInformation] = useState<algosdk.modelsv2.Account | null>(null);
  const {display: displayToast} = useToaster();

  const refetchAccountDetail = useCallback(async () => {
    if (chain && accountAddress) {
      try {
        const accountInformation = await getAccountInformation(chain, accountAddress);
        setAccountInformation(accountInformation);
      } catch (error) {
        displayToast({
          render() {
            return <PeraToast message={error as unknown as string} />;
          }
        });
      }
    }
  }, [accountAddress, chain, displayToast]);

  useEffect(() => {
    if (accountAddress) {
      refetchAccountDetail();
    }
  }, [accountAddress, refetchAccountDetail]);

  return {
    accountInformation,
    refetchAccountDetail
  };
}

export default useGetAccountDetailRequest;
