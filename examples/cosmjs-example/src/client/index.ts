import type { AccountData, AminoSignResponse } from "@cosmjs/amino";
import {
  ExtensionInstallError,
  GetAccountError,
  MobileConnectError,
  SignError,
} from "./error";

import { CosmostationWCModal } from "@cosmostation/wc-modal";
import type { OfflineSigner } from "@cosmjs/proto-signing";
import type { SignAminoDoc } from "@cosmostation/extension-client/types/message";
import WalletConnect from "@walletconnect/client";
import { cosmos } from "@cosmostation/extension-client";
import { isMobile } from "@walletconnect/browser-utils";
import { payloadId } from "@walletconnect/utils";

export { ExtensionInstallError };

export interface CosmostationAccount {
  address: Uint8Array;
  algo: string;
  bech32Address: string;
  isNanoLedger: boolean;
  name: string;
  pubKey: Uint8Array;
}

export const getExtensionOfflineSigner = async (
  chainId: string
): Promise<OfflineSigner> => {
  try {
    const provider = await cosmos();
    await provider.requestAccount(chainId);

    const signer: OfflineSigner = {
      getAccounts: async () => {
        const response = await provider.getAccount(chainId);
        return [
          {
            address: response.address,
            pubkey: response.publicKey,
            algo: "secp256k1",
          },
        ];
      },
      signAmino: async (_, signDoc) => {
        const response = await provider.signAmino(
          chainId,
          signDoc as unknown as SignAminoDoc
        );

        return {
          signed: response.signed_doc,
          signature: {
            pub_key: response.pub_key,
            signature: response.signature,
          },
        };
      },
      signDirect: async (_, signDoc) => {
        const response = await provider.signDirect(chainId, {
          account_number: String(signDoc.accountNumber),
          auth_info_bytes: signDoc.authInfoBytes,
          body_bytes: signDoc.bodyBytes,
          chain_id: signDoc.chainId,
        });
        return {
          signed: {
            accountNumber: response.signed_doc
              .account_number as unknown as Long,
            chainId: response.signed_doc.chain_id,
            authInfoBytes: response.signed_doc.auth_info_bytes,
            bodyBytes: response.signed_doc.body_bytes,
          },
          signature: {
            pub_key: response.pub_key,
            signature: response.signature,
          },
        };
      },
    };

    return signer;
  } catch {
    throw new ExtensionInstallError();
  }
};

export const connectWallet = async (): Promise<WalletConnect> => {
  const connector = new WalletConnect({
    bridge: "https://bridge.walletconnect.org",
    signingMethods: [
      "cosmostation_wc_accounts_v1",
      "cosmostation_wc_sign_tx_v1",
    ],
    qrcodeModal: new CosmostationWCModal(),
  });

  return new Promise((resolve, reject) => {
    void connector.killSession();
    void connector.createSession();

    connector.on("connect", (error) => {
      if (error) {
        return reject(error);
      }
      return resolve(connector);
    });
  });
};

export const getMobileOfflineSignerWithConnect = async (
  chainId: string
): Promise<OfflineSigner> => {
  const connector = await connectWallet();

  if (!connector) {
    throw new MobileConnectError();
  }

  const signer: OfflineSigner = {
    getAccounts: async () => {
      try {
        const params = {
          id: payloadId(),
          jsonrpc: "2.0",
          method: "cosmostation_wc_accounts_v1",
          params: [chainId],
        };
        const keys = (await connector.sendCustomRequest(
          params
        )) as CosmostationAccount[];
        const accounts = keys.map(
          (key) =>
            ({
              address: key.bech32Address,
              algo: "secp256k1",
              pubkey: key.pubKey,
            } as AccountData)
        );
        return accounts;
      } catch (err) {
        throw new GetAccountError();
      }
    },
    signAmino: async (signerAddress, signDoc) => {
      try {
        const signedTx = (await connector.sendCustomRequest({
          id: payloadId(),
          jsonrpc: "2.0",
          method: "cosmostation_wc_sign_tx_v1",
          params: [chainId, signerAddress, signDoc],
        })) as AminoSignResponse[];
        return signedTx[0];
      } catch (err) {
        throw new SignError();
      }
    },
  };

  return signer;
};

export const getOfflineSigner = async (chainId: string) => {
  if (isMobile()) {
    return getMobileOfflineSignerWithConnect(chainId);
  }
  return getExtensionOfflineSigner(chainId);
};
