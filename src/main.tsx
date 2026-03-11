import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "./styles/editor.scss";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./store";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
