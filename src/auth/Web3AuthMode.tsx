/**
 * Web3Auth-backed half of the AuthProvider.
 *
 * Lives in its own file so it can be lazy-loaded by `AuthProvider.tsx` —
 * static imports of `@web3auth/modal` evaluate SDK module-level code that
 * touches `Uint8Array` / `crypto.subtle` and crashes in jsdom test
 * environments. Lazy loading also keeps the Web3Auth bundle (large) out
 * of the default chunk for visitors in mock mode.
 */

import {
  Web3AuthProvider,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
} from "@web3auth/modal/react";
import {
  CHAIN_NAMESPACES,
  WEB3AUTH_NETWORK,
  type Web3AuthOptions,
} from "@web3auth/modal";
import {
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

import { AuthContext, type AuthContextValue, type AuthState } from "./AuthContext";

function buildWeb3AuthOptions(clientId: string): Web3AuthOptions {
  return {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    chains: [
      {
        chainNamespace: CHAIN_NAMESPACES.SOLANA,
        // Web3Auth v10 chain IDs for Solana: 0x65=mainnet, 0x66=testnet,
        // 0x67=devnet. Using "0x3" here (the previous value) routed the
        // session through the EVM controller because 0x3 is Ethereum's
        // Ropsten — caused `eth_blockNumber` calls to the Solana RPC.
        chainId: "0x67",
        rpcTarget: "https://api.devnet.solana.com",
        displayName: "Solana Devnet",
        blockExplorerUrl: "https://explorer.solana.com?cluster=devnet",
        ticker: "SOL",
        tickerName: "Solana",
        logo: "https://images.toruswallet.io/solana.svg",
      },
    ],
    defaultChainId: "0x67",
  };
}

function Web3AuthAdapter({ children }: { children: ReactNode }) {
  const connect = useWeb3AuthConnect();
  const disconnect = useWeb3AuthDisconnect();
  const user = useWeb3AuthUser();

  const state = useMemo<AuthState>(() => {
    if (connect.error) {
      return {
        status: "error",
        message: connect.error.message ?? "Falha ao conectar",
      };
    }
    if (connect.loading || user.loading) return { status: "authenticating" };
    if (connect.isConnected) {
      return {
        status: "authenticated",
        profile: {
          name: user.userInfo?.name ?? undefined,
          email: user.userInfo?.email ?? undefined,
          profileImage: user.userInfo?.profileImage ?? undefined,
        },
      };
    }
    return { status: "unauthenticated" };
  }, [
    connect.error,
    connect.isConnected,
    connect.loading,
    user.loading,
    user.userInfo?.email,
    user.userInfo?.name,
    user.userInfo?.profileImage,
  ]);

  const login = useCallback(async () => {
    await connect.connect();
  }, [connect]);

  const logout = useCallback(async () => {
    await disconnect.disconnect();
  }, [disconnect]);

  const value = useMemo<AuthContextValue>(
    () => ({ mode: "web3auth", state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default function Web3AuthMode({
  clientId,
  children,
}: {
  clientId: string;
  children: ReactNode;
}) {
  return (
    <Web3AuthProvider config={{ web3AuthOptions: buildWeb3AuthOptions(clientId) }}>
      <Web3AuthAdapter>{children}</Web3AuthAdapter>
    </Web3AuthProvider>
  );
}
