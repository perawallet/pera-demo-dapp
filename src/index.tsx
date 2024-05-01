import "@hipo/react-ui-toolkit/dist/main.css";
import "./_index.scss";

import React from "react";
import {ToastContextProvider} from "@hipo/react-ui-toolkit";
import {createRoot} from 'react-dom/client';

import App from "./core/app/App";
import reportWebVitals from "./reportWebVitals";


const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<React.StrictMode>
  <ToastContextProvider>
    <App />
  </ToastContextProvider>
</React.StrictMode>);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
