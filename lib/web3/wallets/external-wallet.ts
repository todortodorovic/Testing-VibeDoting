import { Wallet, WalletAccount } from "@talismn/connect-wallets"
import { WalletProviderType } from "@/lib/web3/types/web3"

/**
 * Mock Wallet for "View as Wallet" functionality (read-only)
 */
export class ExternalWallet implements Wallet {
  extensionName = WalletProviderType.ExternalWallet
  title = "External Wallet"
  installUrl = ""
  logo = {
    src: "",
    alt: "External Wallet",
  }

  _extension: unknown
  _signer: unknown
  account: WalletAccount | undefined

  get extension() {
    return this._extension
  }

  get signer() {
    return this._signer
  }

  get installed() {
    return true
  }

  transformError = (err: Error): Error => {
    return err
  }

  enable = async (dappName: string) => {
    this._extension = {}
    return Promise.resolve(dappName)
  }

  setAddress = async (address?: string) => {
    if (address) {
      if (!this._extension) this._extension = {}
      this.account = {
        address,
        source: this.extensionName,
        name: "External Account",
        wallet: this,
        signer: this.signer,
      }
    } else {
      this.account = undefined
    }
  }

  getAccounts = async (): Promise<WalletAccount[]> => {
    return Promise.resolve(this.account ? [this.account] : [])
  }

  subscribeAccounts = async () => Promise.resolve()
}
