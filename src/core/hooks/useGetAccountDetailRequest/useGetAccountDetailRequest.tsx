import {useToaster} from "@hipo/react-ui-toolkit";
import {useCallback, useEffect} from "react";

import PeraToast from "../../component/toast/PeraToast";
import {getAccountInformation} from "../../utils/account/accountUtils";
import {ChainType} from "../../utils/algod/algod";
import useAsyncProcess from "../useAsyncProcess/useAsyncProcess";
import algosdk from "algosdk";

function useGetAccountDetailRequest({
  chain,
  accountAddress
}: {
  chain: ChainType;
  accountAddress: string;
}) {
  const {
    state: accountInformationState,
    runAsyncProcess: runGetAccountInformationAsyncProcess
  } = useAsyncProcess<algosdk.modelsv2.Account>();
  const {display: displayToast} = useToaster();

  const refetchAccountDetail = useCallback(() => {
    if (chain && accountAddress) {
      try {
        runGetAccountInformationAsyncProcess(
          getAccountInformation(chain, accountAddress)
        );
      } catch (error) {
        displayToast({
          render() {
            return <PeraToast message={error as unknown as string} />;
          }
        });
      }
    }
  }, [accountAddress, chain, displayToast, runGetAccountInformationAsyncProcess]);

  useEffect(() => {
    refetchAccountDetail();
  }, [refetchAccountDetail]);

  return {
    accountInformationState,
    refetchAccountDetail
  };
}

export default useGetAccountDetailRequest;
