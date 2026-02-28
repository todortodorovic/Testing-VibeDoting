import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/web"
import { paseo } from "@polkadot-api/descriptors"
import { CHAIN_CONFIG } from "./constants"
import { isInHost } from "@/lib/host/detect"
import { createPapiProvider } from "@novasamatech/product-sdk"

let clientInstance: ReturnType<typeof createClient> | null = null

export function getPolkadotClient() {
  if (clientInstance) return clientInstance

  const wsProvider = getWsProvider(CHAIN_CONFIG.rpcEndpoint)

  if (isInHost()) {
    // Host mode — route RPC through host, fallback to WS
    const provider = createPapiProvider(CHAIN_CONFIG.genesisHash, wsProvider)
    clientInstance = createClient(provider)
  } else {
    // Standalone mode — direct WebSocket
    clientInstance = createClient(wsProvider)
  }

  return clientInstance
}

export function getTypedApi() {
  const client = getPolkadotClient()
  return client.getTypedApi(paseo)
}

export function disconnect() {
  if (clientInstance) {
    clientInstance.destroy()
    clientInstance = null
  }
}
