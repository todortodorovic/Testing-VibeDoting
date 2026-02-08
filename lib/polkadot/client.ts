import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { paseo } from "@polkadot-api/descriptors"
import { CHAIN_CONFIG } from "./constants"

let clientInstance: ReturnType<typeof createClient> | null = null

export function getPolkadotClient() {
  if (clientInstance) return clientInstance

  const wsProvider = getWsProvider(CHAIN_CONFIG.rpcEndpoint)
  clientInstance = createClient(wsProvider)

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
