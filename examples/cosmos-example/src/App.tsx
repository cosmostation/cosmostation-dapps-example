import "./App.css";

import { useEffect, useState } from "react";

import { CosmostationWCModal } from "./modal";
import WalletConnect from "@walletconnect/client";
import axios from "axios";
import logo from "./logo.svg";
import { makeSignDoc as makeAminoSignDoc } from "@cosmjs/amino";
import { payloadId } from "@walletconnect/utils";

const CHAIN_ID = "station-testnet";
const LCD_ENDPOINT = "https://lcd-office.cosmostation.io/station-testnet/";
const DENOM = "uiss";

export const decodeBase64 = (str: string): string =>
  Buffer.from(str, "base64").toString("binary");
export const decodeHex = (str: string): string =>
  Buffer.from(str, "hex").toString("binary");

function App() {
  const [connector, setConnector] = useState<WalletConnect>();
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (connector !== undefined) {
      getAccount();
    }
  }, [connector]);

  async function connect() {
    const connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
      signingMethods: [
        "cosmostation_wc_accounts_v1",
        "cosmostation_wc_sign_tx_v1",
      ],
      qrcodeModal: new CosmostationWCModal(),
    });

    if (connector.connected) {
      await connector.killSession();
    }

    await connector.createSession();

    connector.on("connect", (error, payload) => {
      if (error) {
        throw error;
      }
      setConnector(connector);
    });
  }

  async function signTx() {
    if (connector == null || accounts == null) {
      return;
    }

    const address = accounts[0]["bech32Address"];

    if (address) {
      const to = address;
      const url = `${LCD_ENDPOINT}/cosmos/auth/v1beta1/accounts/${address}`;
      axios.get(url).then((response) => {
        const accountNumber = response.data.account.account_number;
        const sequence = response.data.account.sequence;
        const message = makeAminoSendMessage(address, to, "1");
        const fee = {
          amount: [{ denom: DENOM, amount: "0" }],
          gas: "80000",
        };
        const signDoc = makeAminoSignDoc(
          [message],
          fee,
          CHAIN_ID,
          "",
          accountNumber,
          sequence
        );
        const request = {
          id: payloadId(),
          jsonrpc: "2.0",
          method: "cosmostation_wc_sign_tx_v1",
          params: [CHAIN_ID, address, signDoc],
        };

        connector
          .sendCustomRequest(request)
          .then((response) => {
            const signed = response.signed;
            const signature = response.signature;
            console.log(response, signed, signature);
          })
          .then((result) => {
            console.log(result);
          });
      });
    }
  }

  function makeAminoSendMessage(from: string, to: string, amount: string) {
    return {
      type: "cosmos-sdk/MsgSend",
      value: {
        amount: [
          {
            amount: String(amount),
            denom: DENOM,
          },
        ],
        from_address: from,
        to_address: to,
      },
    };
  }

  async function getAccount() {
    if (connector == null) {
      return;
    }

    connector
      .sendCustomRequest({
        id: payloadId(),
        jsonrpc: "2.0",
        method: "cosmostation_wc_accounts_v1",
        params: [CHAIN_ID],
      })
      .then((accounts) => {
        console.log(accounts);
        setAccounts(accounts);
      })
      .catch((error) => {
        console.error(error);
        alert(error.message);
        setAccounts([]);
      });
  }

  return (
    <div className="App">
      <header className="App-header">
        <h2>
          Cosmostation Dapps
          <br />
          cosmos example
        </h2>
        <img src={logo} className="App-logo" alt="logo" />
        <br />
        {connector === undefined && (
          <button onClick={connect}>Connect by Cosmostation</button>
        )}
        {accounts !== undefined && accounts.length > 0 && (
          <div>
            <div>
              <small>address : {accounts[0]["bech32Address"]}</small>
            </div>
            <br />
            <div>
              <button onClick={signTx}>Sign : Send 1 tx</button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
