import "./App.css";

import { useCallback, useEffect, useState } from "react";

import { CosmostationWCModal } from "@cosmostation/wc-modal";
import axios from "axios";
import logo from "./logo.svg";
import { makeSignDoc as makeAminoSignDoc } from "@cosmjs/amino";
import Client from "@walletconnect/sign-client";
import {
  PairingTypes,
  ProposalTypes,
  SessionTypes,
} from "@walletconnect/types";

const CHAIN_ID = "cosmoshub-4";
const LCD_ENDPOINT = "https://api-cosmoshub-ia.cosmosia.notional.ventures";
const DENOM = "uatom";

export const decodeBase64 = (str: string): string =>
  Buffer.from(str, "base64").toString("binary");
export const decodeHex = (str: string): string =>
  Buffer.from(str, "hex").toString("binary");

function App() {
  const [client, setClient] = useState<Client>();
  const [pairings, setPairings] = useState<PairingTypes.Struct[]>([]);
  const [session, setSession] = useState<SessionTypes.Struct>();
  const [chains, setChains] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);

  useEffect(() => {
    if (client === undefined) {
      createClient();
    }
  }, [client]);

  const createClient = async () => {
    try {
      const _client = await Client.init({
        projectId: "57a6070dfa02b49cc83f17171299a6b8",
        metadata: {
          name: "React App",
          description: "React App for WalletConnect",
          url: "https://walletconnect.com/",
          icons: ["https://avatars.githubusercontent.com/u/37784886"],
        },
      });

      _client.on("session_update", ({ topic, params }) => {
        console.log("EVENT", "session_update", { topic, params });
        const { namespaces } = params;
        const _session = _client.session.get(topic);
        const updatedSession = { ..._session, namespaces };
        onSessionConnected(updatedSession);
      });

      setClient(_client);
    } catch (err) {
      throw err;
    } finally {
    }
  };

  async function connect() {
    const modal = new CosmostationWCModal();
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }

    try {
      const requiredNamespaces = getRequiredNamespaces();
      const { uri, approval } = await client.connect({
        pairingTopic: undefined,
        requiredNamespaces: {
          cosmos: {
            methods: ["cosmos_signDirect", "cosmos_signAmino"],
            chains: ["cosmos:cosmoshub-4"],
            events: [],
          },
        },
      });

      if (uri) {
        const standaloneChains = Object.values(requiredNamespaces)
          .map((namespace) => namespace.chains)
          .flat();

        modal.open(uri, standaloneChains);
      }

      const session = await approval();
      console.log("Established session:", session);
      await onSessionConnected(session);
      // Update known pairings after session is connected.
      setPairings(client.pairing.getAll({ active: true }));
    } catch (e) {
      console.error(e);
      // ignore rejection
    } finally {
      // close modal in case it was open
      modal.close();
    }
  }

  const getRequiredNamespaces = (): ProposalTypes.RequiredNamespaces => {
    return Object.fromEntries(
      chains.map((namespace) => [
        namespace,
        {
          methods: ["cosmos_signDirect", "cosmos_signAmino"],
          chains: chains.filter((chain) => chain.startsWith(namespace)),
          events: [],
        },
      ])
    );
  };

  const onSessionConnected = useCallback(
    async (_session: SessionTypes.Struct) => {
      const allNamespaceAccounts = Object.values(_session.namespaces)
        .map((namespace) => namespace.accounts)
        .flat();
      const allNamespaceChains = Object.keys(_session.namespaces);

      setSession(_session);
      setChains(allNamespaceChains);
      setAccounts(allNamespaceAccounts);
    },
    []
  );

  async function signTx() {
    if (accounts == null || client == null) {
      return;
    }
    const address = accounts[0].split(":")[2];
    if (address) {
      const to = address;
      const url = `${LCD_ENDPOINT}/cosmos/auth/v1beta1/accounts/${address}`;
      axios.get(url).then(async (response) => {
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
        const params = { signerAddress: address, signDoc };
        const result = await client.request({
          topic: session!.topic,
          chainId: accounts[0].split(":")[0] + ":" + accounts[0].split(":")[1],
          request: {
            method: "cosmos_signAmino",
            params: params,
          },
        });
        console.log(result);
        alert("sign success(console)");
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
        {/* {client === undefined && ( */}
        <button onClick={connect}>Connect by Cosmostation</button>
        {/* )} */}
        {accounts !== undefined && accounts.length > 0 && (
          <div>
            <div>
              <button onClick={signTx}>Sign : Send myself</button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
