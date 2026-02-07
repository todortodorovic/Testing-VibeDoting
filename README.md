# Polkadot Wallet Connection Demo

Kompletan demo projekat za konekciju Polkadot wallet-a sa podrškom za više wallet providera.

## 🚀 Započni

### Instalacija

```bash
npm install
```

### Pokretanje

```bash
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000) u browseru.

## ✨ Funkcionalnosti

- ✅ **Multi-wallet support**: Polkadot.js, Talisman, Nova Wallet, SubWallet, WalletConnect
- ✅ **External Wallet**: Read-only mod za bilo koju Substrate adresu
- ✅ **Zustand store**: Centralizovano state upravljanje sa perzistencijom
- ✅ **React Query**: Optimizovano preuzimanje podataka
- ✅ **Modal interfejs**: Bolji UX sa multi-step procesom
- ✅ **SS58 Address handling**: Automatska konverzija između različitih chain formata
- ✅ **Account dropdown**: Prikazivanje trenutnog naloga sa copy/disconnect opcijama
- ✅ **TypeScript**: Potpuna type safety

## 📦 Tehnologije

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Zustand (state management)
- React Query (data fetching)
- Polkadot.js
- Radix UI (komponente)

## 🔧 Kako koristiti

### Konekcija wallet-a

1. Klikni na "Connect Wallet" dugme
2. Izaberi wallet iz liste (Polkadot.js, Talisman, Nova, itd.)
3. Odobri konekciju u browser ekstenziji
4. Izaberi nalog
5. Gotovo!

### External Wallet (read-only)

1. Klikni na "Connect Wallet"
2. Izaberi "External Wallet"
3. Unesi bilo koju validnu Substrate adresu
4. Adresa će biti prikazana u read-only modu

## 📁 Struktura projekta

```
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout sa Web3Provider
│   ├── page.tsx           # Homepage
│   └── globals.css        # Globalni stilovi
├── components/
│   └── ui/                # Shadcn UI komponente
├── lib/
│   ├── utils.ts           # Helper funkcije
│   └── web3/              # Web3 implementacija
│       ├── components/    # Web3 komponente
│       ├── constants/     # Konstante
│       ├── hooks/         # React hooks
│       ├── store/         # Zustand store
│       ├── types/         # TypeScript tipovi
│       ├── utils/         # Utility funkcije
│       └── wallets/       # Wallet implementacije
└── ...
```

## 🎯 Primjer korišćenja

```typescript
import { Web3ConnectButton, useAccount } from "@/lib/web3"

export function MyComponent() {
  const { account } = useAccount()

  return (
    <div>
      <Web3ConnectButton />
      {account && (
        <p>Connected as: {account.name}</p>
      )}
    </div>
  )
}
```

## 📝 Napomene

- Za potpunu funkcionalnost potrebna je instalirana wallet ekstenzija (Polkadot.js, Talisman, itd.)
- External Wallet opcija radi bez instaliranih ekstenzija
- State se čuva u localStorage i persitira nakon refresh-a

## 📚 Dokumentacija

Puna dokumentacija se nalazi u `wallet-polkadot-wallet-connection.md`.

## 🐛 Problemi

Ako naiđeš na probleme:

1. Proveri da li je wallet ekstenzija instalirana
2. Proveri konzolu za greške
3. Probaj sa External Wallet opcijom za testiranje

## 📄 Licenca

MIT
