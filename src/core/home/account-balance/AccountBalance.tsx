import algosdk from "algosdk";
import {Box, Card, CardContent, Typography} from "@mui/material";

import {getAccountBalanceText} from "../../utils/account/accountUtils";
import {ChainType} from "../../utils/algod/algod";
import {getWalletDetailsFromStorage} from "../../utils/storage/storageUtils";
import {truncateAccountAddress} from "../../utils/string/stringUtils";

interface AccountBalanceProps {
  accountInformation: algosdk.modelsv2.Account;
  chain: ChainType;
}

const AccountBalance = ({accountInformation, chain}: AccountBalanceProps) => {
  const walletDetails = getWalletDetailsFromStorage();

  const rows: {label: string; value: React.ReactNode}[] = [
    {
      label: "Connected to",
      value: truncateAccountAddress(accountInformation.address)
    },
    {label: "Chain", value: chain.toUpperCase()},
    {label: "Wallet Type", value: walletDetails?.type ?? "-"},
    {label: "Balance", value: getAccountBalanceText(accountInformation)}
  ];

  return (
    <Card variant={"outlined"} sx={{mb: 2}}>
      <CardContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {xs: "1fr", sm: "repeat(2, 1fr)"},
            rowGap: 1,
            columnGap: 3
          }}>
          {rows.map((row) => (
            <Box key={row.label} sx={{display: "flex", gap: 1}}>
              <Typography
                variant={"body2"}
                sx={{fontWeight: 600, color: "primary.main"}}>
                {`${row.label}:`}
              </Typography>
              <Typography variant={"body2"}>{row.value}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AccountBalance;
