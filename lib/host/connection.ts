import {
  injectSpektrExtension,
} from "@novasamatech/product-sdk"
import { isInHost } from "./detect"

let spektrReady = false

export async function connectToHost(
  maxRetries = 10,
  delayMs = 500
): Promise<boolean> {
  if (!isInHost()) return false
  if (spektrReady) return true

  for (let i = 0; i < maxRetries; i++) {
    try {
      const ready = await injectSpektrExtension()
      if (ready) {
        spektrReady = true
        return true
      }
    } catch (e: any) {
      console.log(`[Host] Attempt ${i + 1} error: ${e?.message || e}`)
    }
    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  return false
}
