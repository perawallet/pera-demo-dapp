import React from "react";
import ReactDOM from "react-dom/client";
import {ThemeProvider, CssBaseline} from "@mui/material";

import App from "./core/app/App";
import theme from "./core/theme/theme";
import {PeraToastProvider} from "./core/component/toast/PeraToast";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PeraToastProvider>
        <App />
      </PeraToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
