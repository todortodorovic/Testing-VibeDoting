export type HostEnvironment = "desktop-webview" | "web-iframe" | "standalone"

export function detectHostEnvironment(): HostEnvironment {
  if (typeof window === "undefined") return "standalone"

  // Desktop host injects this mark into the webview
  if ((window as any).__HOST_WEBVIEW_MARK__ === true) {
    return "desktop-webview"
  }

  // Web iframe host
  try {
    if (window !== window.top) {
      return "web-iframe"
    }
  } catch {
    return "web-iframe"
  }

  return "standalone"
}

export function isInHost(): boolean {
  return detectHostEnvironment() !== "standalone"
}
