import {Buffer} from 'buffer';

window.Buffer = Buffer;

import "@hipo/react-ui-toolkit/dist/main.css";
import "./_index.scss";

import React from "react";
import ReactDOM from "react-dom";
import {ToastContextProvider} from "@hipo/react-ui-toolkit";

import App from "./core/app/App";
import reportWebVitals from "./reportWebVitals";

ReactDOM.render(
  <React.StrictMode>
    <ToastContextProvider>
      <App />
    </ToastContextProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
