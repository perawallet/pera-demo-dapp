import "./_index.scss";

import React from "react";
import ReactDOM from "react-dom/client";
import {ThemeProvider, CssBaseline} from "@mui/material";

import App from "./core/app/App";
import theme from "./core/theme/theme";
import {PeraToastProvider} from "./core/component/toast/PeraToast";
import {WalletProvider} from "./core/wallet/WalletProvider";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement)

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PeraToastProvider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </PeraToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
