import {useCallback, useEffect, useState} from "react";

import {usePeraToast} from "../../component/toast/PeraToast";
import {getAccountInformation} from "../../utils/account/accountUtils";
import {ChainType} from "../../utils/algod/algod";
import algosdk from "algosdk";

const useGetAccountDetailRequest = ({
  chain,
  accountAddress,
  endpointKey
}: {
  chain: ChainType;
  accountAddress: string | null;
  /** Identifies the resolved algod endpoint (baseServer + port), not just the
   *  network enum. Custom's endpoint can change while `chain` stays
   *  `ChainType.Custom`, which would otherwise leave this callback's identity
   *  (and therefore the refetch effect) unchanged and the balance stale. */
  endpointKey: string;
}) => {
  const [accountInformation, setAccountInformation] =
    useState<algosdk.modelsv2.Account | null>(null);
  const {display: displayToast} = usePeraToast();

  const refetchAccountDetail = useCallback(async () => {
    if (chain && accountAddress) {
      try {
        const accountInformation = await getAccountInformation(chain, accountAddress);
        setAccountInformation(accountInformation);
      } catch (error) {
        displayToast({
          message: error as unknown as string,
          severity: "error"
        });
      }
    }
  }, [accountAddress, chain, displayToast, endpointKey]);

  useEffect(() => {
    if (accountAddress) {
      refetchAccountDetail();
    }
  }, [accountAddress, refetchAccountDetail]);

  return {
    accountInformation,
    refetchAccountDetail
  };
};

export default useGetAccountDetailRequest;
