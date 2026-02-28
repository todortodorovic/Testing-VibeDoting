import { createPapiProvider } from "@novasamatech/product-sdk"
import { createClient, PolkadotClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/web"
import { isInHost } from "./detect"
import { CHAIN_CONFIG } from "@/lib/polkadot/constants"

let client: PolkadotClient | null = null

export function getHostAwareClient(): PolkadotClient {
  if (client) return client

  if (isInHost()) {
    // Host mode — route RPC through host, fallback to WS
    const provider = createPapiProvider(
      CHAIN_CONFIG.genesisHash,
      getWsProvider(CHAIN_CONFIG.rpcEndpoint)
    )
    client = createClient(provider)
  } else {
    // Standalone mode — direct WebSocket
    const provider = getWsProvider(CHAIN_CONFIG.rpcEndpoint)
    client = createClient(provider)
  }

  return client
}

export function disconnectHostClient() {
  if (client) {
    client.destroy()
    client = null
  }
}
