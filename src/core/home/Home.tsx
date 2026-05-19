import algosdk from "algosdk";
import {useCallback, useEffect, useState} from "react";
import type {MouseEvent} from "react";
import type {SignerTransaction} from "@perawallet/connect";
import {PeraOnramp} from "@perawallet/onramp";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  Chip,
  Avatar,
  Dialog,
  DialogContent,
  DialogTitle,
  Container,
  Drawer,
  List,
  ListItem
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import BuildIcon from "@mui/icons-material/Build";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsIcon from "@mui/icons-material/Settings";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import AccountBalance from "./account-balance/AccountBalance";
import SignTxn from "./sign-txn/SignTxn";
import CreateTxn from "./sign-txn/create/CreateTxn";
import {usePeraToast} from "../component/toast/PeraToast";
import {apiGetTxnParams, ChainType, clientForChain} from "../utils/algod/algod";
import useGetAccountDetailRequest from "../hooks/useGetAccountDetailRequest/useGetAccountDetailRequest";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../utils/storage/pera-wallet/peraWalletTypes";
import peraApiManager from "../utils/pera/api/peraApiManager";
import DeeplinkGenerator from "../deeplink/DeeplinkGenerator";
import UriGenerator from "./sign-txn/uri-generator/UriGenerator";
import peraWallet, {PeraWalletManager} from "../utils/pera-wallet/PeraWalletManager";

const peraOnRamp = new PeraOnramp({
  optInEnabled: true
});

const Home = () => {
  const [chainType, setChainType] = useState<ChainType>(ChainType.TestNet);
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const isConnectedToPeraWallet = !!accountAddress;
  const {display: displayToast, history, clearHistory} = usePeraToast();
  const {accountInformation, refetchAccountDetail} = useGetAccountDetailRequest({
    chain: chainType,
    accountAddress
  });
  const [isConnectCompactMode, setConnectCompactMode] = useState(
    peraWallet.compactMode || false
  );

  // Menus / popovers
  const [generatorsAnchor, setGeneratorsAnchor] = useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<HTMLElement | null>(null);

  // Modals controlled at Home level
  const [showDeeplink, setShowDeeplink] = useState(false);
  const [showUriGenerator, setShowUriGenerator] = useState(false);
  const [createTxnOpen, setCreateTxnOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const handleSetLog = useCallback(
    (log: string) => {
      displayToast({
        timeout: 10000,
        message: log
      });
    },
    [displayToast]
  );

  useEffect(() => {
    peraWallet.updateConfig({
      compactMode: isConnectCompactMode,
      chainId: PeraWalletManager.getChainId(chainType)
    });
  }, [isConnectCompactMode, chainType]);

  useEffect(() => {
    peraWallet
      .reconnectSessionAndSetupEventHandlers({
        onDisconnect: async () => {
          setAccountAddress(null);
        }
      })
      .then((accounts) => {
        if (accounts && accounts[0]) {
          setAccountAddress(accounts[0]);
          refetchAccountDetail();
          handleSetLog("Connected to Pera Wallet");
        }
      })
      .catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ADDRESS_PREFIX_LEN = 4;
  const ADDRESS_SUFFIX_LEN = 4;
  const shortAddress = accountAddress
    ? `${accountAddress.slice(0, ADDRESS_PREFIX_LEN)}…${accountAddress.slice(
        -ADDRESS_SUFFIX_LEN
      )}`
    : "";
  const avatarInitial = accountAddress ? accountAddress.charAt(0).toUpperCase() : "";
  const wcServer = peraWallet.connector?.bridge;

  const handleChainToggle = (
    _e: MouseEvent<HTMLElement>,
    value: "testnet" | "mainnet" | null
  ) => {
    if (!value) return;
    if (value === "testnet") {
      const newChainType = ChainType.TestNet;
      setChainType(newChainType);
      peraApiManager.updateFetcher(newChainType);
      peraWallet.updateConfig({
        chainId: PeraWalletManager.getChainId(newChainType)
      });
    } else {
      const newChainType = ChainType.MainNet;
      setChainType(newChainType);
      peraApiManager.updateFetcher(newChainType);
      peraWallet.updateConfig({
        chainId: PeraWalletManager.getChainId(newChainType)
      });
    }
  };

  const handleCompactModeSwitch = () => {
    const newCompactMode = !isConnectCompactMode;
    setConnectCompactMode(newCompactMode);

    localStorage.setItem(
      PERA_WALLET_LOCAL_STORAGE_KEYS.COMPACT_MODE,
      newCompactMode ? "true" : "false"
    );

    peraWallet.updateConfig({
      compactMode: newCompactMode
    });
  };

  const handleCopyAddress = async () => {
    if (accountAddress) {
      try {
        await navigator.clipboard.writeText(accountAddress);
        handleSetLog("Address copied to clipboard");
      } catch (e) {
        handleSetLog(`${e}`);
      }
    }
    setAccountMenuAnchor(null);
  };

  const addFunds = () => {
    if (accountAddress) {
      peraOnRamp
        .addFunds({
          accountAddress
        })
        .then(() => {
          handleSetLog("Funds added");
        })
        .catch((e) => {
          handleSetLog(`${e}`);
        });
    }
  };

  const handleAddFunds = () => {
    if (accountAddress) {
      addFunds();

      peraOnRamp.on({
        OPT_IN_REQUEST: async ({accountAddress: addr, assetID}) => {
          try {
            const suggestedParams = await apiGetTxnParams(chainType);
            const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
              sender: addr,
              receiver: addr,
              amount: 0,
              assetIndex: Number(assetID),
              note: new Uint8Array(Buffer.from("example note value")),
              suggestedParams
            });
            const txnsToSign = [[{txn}]];

            const transactions: SignerTransaction[] = txnsToSign.reduce(
              (acc, val) => acc.concat(val),
              []
            );

            const signedTxn = await peraWallet.signTransaction([transactions]);

            await clientForChain(chainType).sendRawTransaction(signedTxn).do();

            peraOnRamp.close();

            addFunds();
          } catch (error) {
            handleSetLog(`${error}`);
          }
        },
        ADD_FUNDS_COMPLETED: () => {
          handleSetLog("Add funds completed");
        },
        ADD_FUNDS_FAILED: () => {
          handleSetLog("Add funds failed");
        }
      });
    }
  };

  const handleConnectWalletClick = async () => {
    try {
      const newAccounts = await peraWallet.connectAndSetupEventHandlers({
        onDisconnect: async () => {
          setAccountAddress(null);
        }
      });

      handleSetLog("Connected to Pera Wallet");

      setAccountAddress(newAccounts[0]);
    } catch (e) {
      console.error(e);
      handleSetLog(`${e}`);
    }
  };

  const handleDisconnectWalletClick = () => {
    peraWallet.disconnect();
    setAccountAddress(null);
  };

  return (
    <Box>
      <AppBar position={"static"}>
        <Toolbar sx={{gap: {xs: 0.5, sm: 1.5}}}>
          <Box
            component={"img"}
            src={`${process.env.PUBLIC_URL}/logo192.png`}
            alt={"Pera"}
            sx={{height: 32, width: 32, mr: {xs: 0.5, sm: 1.5}, borderRadius: 1}}
          />
          <Typography
            variant={"h6"}
            component={"div"}
            sx={{fontWeight: 600, display: {xs: "none", md: "block"}}}>
            {"Pera Demo dApp"}
          </Typography>

          <Box sx={{flexGrow: 1}} />

          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: {xs: 0.25, sm: 1.5}
            }}>
            <ToggleButtonGroup
              size={"small"}
              exclusive={true}
              value={chainType === ChainType.MainNet ? "mainnet" : "testnet"}
              onChange={handleChainToggle}
              aria-label={"network selection"}
              sx={{"& .MuiToggleButton-root": {px: {xs: 1, sm: 1.5}}}}>
              <ToggleButton value={"testnet"} aria-label={"TestNet"}>
                <Box sx={{display: {xs: "none", sm: "inline"}}}>{"TestNet"}</Box>
                <Box sx={{display: {xs: "inline", sm: "none"}}}>{"Test"}</Box>
              </ToggleButton>
              <ToggleButton value={"mainnet"} aria-label={"MainNet"}>
                <Box sx={{display: {xs: "none", sm: "inline"}}}>{"MainNet"}</Box>
                <Box sx={{display: {xs: "inline", sm: "none"}}}>{"Main"}</Box>
              </ToggleButton>
            </ToggleButtonGroup>

            <Button
              color={"inherit"}
              onClick={(e) => setGeneratorsAnchor(e.currentTarget)}
              endIcon={<ArrowDropDownIcon sx={{display: {xs: "none", sm: "inline-flex"}}} />}
              startIcon={<BuildIcon sx={{display: {xs: "inline-flex", sm: "none"}, mr: -0.5}} />}
              sx={{
                minWidth: {xs: 40, sm: "auto"},
                px: {xs: 1, sm: 1.5}
              }}>
              <Box sx={{display: {xs: "none", sm: "inline"}}}>{"Generators"}</Box>
            </Button>
            <Menu
              anchorEl={generatorsAnchor}
              open={Boolean(generatorsAnchor)}
              onClose={() => setGeneratorsAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setShowUriGenerator(true);
                  setGeneratorsAnchor(null);
                }}>
                {"ARC-90 URI Generator"}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setShowDeeplink(true);
                  setGeneratorsAnchor(null);
                }}>
                {"Pera Deeplink Generator"}
              </MenuItem>
              <MenuItem
                disabled={!accountAddress}
                onClick={() => {
                  setCreateTxnOpen(true);
                  setGeneratorsAnchor(null);
                }}>
                {"Create Custom Transaction"}
              </MenuItem>
            </Menu>

            <IconButton
              color={"inherit"}
              aria-label={"more"}
              onClick={(e) => setMoreAnchor(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={moreAnchor}
              open={Boolean(moreAnchor)}
              onClose={() => setMoreAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setLogOpen(true);
                  setMoreAnchor(null);
                }}>
                <ListItemIcon>
                  <HistoryIcon fontSize={"small"} />
                </ListItemIcon>
                <ListItemText>{"Activity log"}</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={(e) => e.stopPropagation()}
                disableRipple={true}>
                <ListItemIcon>
                  <SettingsIcon fontSize={"small"} />
                </ListItemIcon>
                <ListItemText>{"Compact connect mode"}</ListItemText>
                <Switch
                  checked={isConnectCompactMode}
                  onChange={handleCompactModeSwitch}
                  size={"small"}
                  onClick={(e) => e.stopPropagation()}
                />
              </MenuItem>
              <Divider />
              <Box sx={{px: 2, py: 1}}>
                <Typography
                  variant={"caption"}
                  sx={{color: "text.secondary", display: "block"}}>
                  {"WC server"}
                </Typography>
                <Typography variant={"body2"} sx={{wordBreak: "break-all"}}>
                  {peraWallet.isConnected && wcServer ? wcServer : "Not connected"}
                </Typography>
              </Box>
              {isConnectedToPeraWallet && [
                <Divider key={"add-funds-divider"} />,
                <MenuItem
                  key={"add-funds-item"}
                  onClick={() => {
                    handleAddFunds();
                    setMoreAnchor(null);
                  }}>
                  <ListItemIcon>
                    <AttachMoneyIcon fontSize={"small"} />
                  </ListItemIcon>
                  <ListItemText>{"Add funds"}</ListItemText>
                </MenuItem>
              ]}
            </Menu>

            {isConnectedToPeraWallet ? (
              <>
                <Chip
                  avatar={<Avatar>{avatarInitial}</Avatar>}
                  label={
                    <Box
                      component={"span"}
                      sx={{display: {xs: "none", sm: "inline"}}}>
                      {shortAddress}
                    </Box>
                  }
                  onClick={(e: MouseEvent<HTMLDivElement>) =>
                    setAccountMenuAnchor(e.currentTarget)
                  }
                  deleteIcon={
                    <ArrowDropDownIcon sx={{display: {xs: "none", sm: "inline-flex"}}} />
                  }
                  onDelete={(e: MouseEvent<HTMLElement>) =>
                    setAccountMenuAnchor(e.currentTarget as HTMLElement)
                  }
                  sx={{
                    cursor: "pointer",
                    "& .MuiChip-label": {
                      px: {xs: 0, sm: 1}
                    }
                  }}
                />
                <Menu
                  anchorEl={accountMenuAnchor}
                  open={Boolean(accountMenuAnchor)}
                  onClose={() => setAccountMenuAnchor(null)}>
                  <MenuItem onClick={handleCopyAddress}>{"Copy address"}</MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleDisconnectWalletClick();
                      setAccountMenuAnchor(null);
                    }}>
                    {"Disconnect"}
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant={"contained"}
                color={"primary"}
                size={"small"}
                onClick={handleConnectWalletClick}
                sx={{whiteSpace: "nowrap"}}>
                {"Connect"}
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {chainType === ChainType.MainNet && (
        <Box
          sx={{
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            fontWeight: 600,
            textAlign: "center",
            py: 1,
            px: 2
          }}
        >
          {"You are using MainNet right now. Please be careful when sending transactions."}
        </Box>
      )}

      <Container maxWidth={"lg"} sx={{mt: 3}}>
        {accountInformation && (
          <AccountBalance accountInformation={accountInformation} chain={chainType} />
        )}

        <SignTxn
          accountAddress={accountAddress}
          peraWallet={peraWallet}
          handleSetLog={handleSetLog}
          chain={chainType}
          refecthAccountDetail={refetchAccountDetail}
        />
      </Container>

      <UriGenerator
        isOpen={showUriGenerator}
        onClose={() => setShowUriGenerator(false)}
      />

      <Dialog
        open={showDeeplink}
        onClose={() => setShowDeeplink(false)}
        fullWidth={true}
        maxWidth={"md"}>
        <DialogTitle sx={{display: "flex", alignItems: "center"}}>
          <Box sx={{flexGrow: 1}}>{"Pera Deeplink Generator"}</Box>
          <IconButton onClick={() => setShowDeeplink(false)} aria-label={"close"}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <DeeplinkGenerator />
        </DialogContent>
      </Dialog>

      <CreateTxn
        chain={chainType}
        peraWallet={peraWallet}
        address={accountAddress ?? ""}
        isOpen={createTxnOpen}
        onClose={() => setCreateTxnOpen(false)}
      />

      <Drawer
        anchor={"right"}
        open={logOpen}
        onClose={() => setLogOpen(false)}>
        <Box
          sx={{
            width: 420,
            p: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%"
          }}>
          <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 1}}>
            <Typography variant={"h6"} sx={{flexGrow: 1}}>
              {"Activity log"}
            </Typography>
            <Button
              size={"small"}
              onClick={clearHistory}
              disabled={history.length === 0}>
              {"Clear"}
            </Button>
            <IconButton
              size={"small"}
              onClick={() => setLogOpen(false)}
              aria-label={"close"}>
              <CloseIcon />
            </IconButton>
          </Box>
          {history.length === 0 ? (
            <Typography variant={"body2"} sx={{color: "text.secondary", mt: 2}}>
              {"No activity yet. Toast messages will appear here as they fire."}
            </Typography>
          ) : (
            <List sx={{flexGrow: 1, overflowY: "auto"}}>
              {[...history].reverse().map((entry) => (
                <ListItem
                  key={entry.id}
                  divider={true}
                  sx={{flexDirection: "column", alignItems: "stretch", py: 1}}>
                  <Box
                    sx={{display: "flex", alignItems: "center", gap: 1, mb: 0.5}}>
                    <Chip
                      label={entry.severity}
                      size={"small"}
                      color={
                        entry.severity === "error"
                          ? "error"
                          : entry.severity === "warning"
                            ? "warning"
                            : entry.severity === "success"
                              ? "success"
                              : "default"
                      }
                    />
                    <Typography variant={"caption"} sx={{color: "text.secondary"}}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </Typography>
                    <Box sx={{flexGrow: 1}} />
                    <IconButton
                      size={"small"}
                      aria-label={"Copy message"}
                      onClick={() =>
                        navigator.clipboard.writeText(String(entry.message))
                      }>
                      <ContentCopyIcon fontSize={"small"} />
                    </IconButton>
                  </Box>
                  <Typography variant={"body2"} sx={{wordBreak: "break-word"}}>
                    {entry.message}
                  </Typography>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default Home;
