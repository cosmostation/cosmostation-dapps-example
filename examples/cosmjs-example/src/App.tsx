import './App.css';

import { GasPrice, calculateFee } from "@cosmjs/stargate";
import { useEffect, useState } from 'react';

import { AccountData } from '@cosmjs/amino';
import type { OfflineSigner } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { getOfflineSigner } from '@cosmostation/cosmos-client';
import logo from './logo.svg';

const CHAIN_ID = 'juno-1';

export const decodeBase64 = (str: string): string => Buffer.from(str, "base64").toString("binary");
export const decodeHex = (str: string): string => Buffer.from(str, "hex").toString("binary");

function App() {
  const [client, setClient] = useState<SigningCosmWasmClient>();
  const [offlineSigner, setOfflineSigner] = useState<OfflineSigner>();
  const [accounts, setAccounts] = useState<readonly AccountData[]>();
  const [balance, setBalance] = useState('');
  const [values, setValues] = useState({
    value: ""
  });
  const { value } = values;
  const changeHandler = (e: any): void => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };
  
  useEffect(() => {
    if (client !== undefined) {
      getAccount()
    }
  }, [client])

  async function connect() {
    const offlineSigner = await getOfflineSigner(CHAIN_ID);
    const rpcEndpoint = "https://rpc-juno.itastakers.com/";
    const client = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, offlineSigner);
    setOfflineSigner(offlineSigner)
    setClient(client)
  }
  
  async function signTx() {
    if (client == null || accounts == null) {
      return
    } 

    const gasPrice = GasPrice.fromString("0.01ujuno");
    const fees = {
      upload: calculateFee(1500000, gasPrice),
      init: calculateFee(500000, gasPrice),
      exec: calculateFee(500000, gasPrice),
    };
    const result = await client.execute(
      accounts[0].address,
      "juno1vaeuky9hqacenay9nmuualugvv54tdhyt2wsvhnjasx9s946hhmqaq3kh7",
      { transfer: { amount: 1, recipient: value } },
      fees.exec
    );
    console.log(result.transactionHash);
  }

  async function getAccount() {
    if (offlineSigner == null || client == null) {
      return
    } 

    const accounts = await offlineSigner.getAccounts();
    setAccounts(accounts);

    let address = accounts[0].address
    let result = await client.queryContractSmart("juno1vaeuky9hqacenay9nmuualugvv54tdhyt2wsvhnjasx9s946hhmqaq3kh7", { balance: { address } })
    setBalance(result.balance);
  }

  return (
    <div className="App">
      <header className="App-header">
        <h2>Cosmostation Dapps<br/>cosmjs example</h2>
        <img src={logo} className="App-logo" alt="logo" />
        <br/>
        { client === undefined &&
          <button onClick={connect}>Connect Cosmostation</button>
        }
        { accounts !== undefined && accounts.length > 0 &&
          <div>
            <div>
              <small>address : {accounts[0].address}</small>
              <br/>
              <small>balance : {balance}</small>
            </div>
            <br/>
            <div>
              <input
                maxLength={100}
                name="value"
                type="text"
                value={value}
                onChange={changeHandler}
              />
              <button onClick={signTx}>Send</button>
            </div>
          </div>
        }
      </header>
    </div>
  );
}

export default App;
