# open-multisig-hl

Open-source browser UI for signing Hyperliquid native multisig transactions with Rabby or MetaMask.

## What it does

Each signer connects their wallet, selects an action type, fills in the payload fields, and signs EIP-712 typed data in-browser. The output is a signature JSON that the coordinator collects and submits via the [Hyperliquid Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk)'s `multi_sig()` method.

No backend required. No private keys leave the browser.

## Supported Actions

### User-Signed Actions (EIP-712 direct)
- **Approve Agent** — authorize an API wallet to trade on behalf of the multisig
- **USD Send** — transfer USDC to another address
- **Spot Send** — transfer spot tokens
- **Withdraw** — withdraw USDC to Arbitrum
- **USD Class Transfer** — move USDC between spot and perp
- **Approve Builder Fee** — approve a builder fee rate
- **Token Delegate (Stake)** — stake/unstake HYPE tokens
- **Convert to MultiSig** — convert account to multisig
- **Send Asset** — send assets between sub-accounts or DEXes

### L1 Actions (Phantom Agent pattern)
- **Vault Transfer** — deposit/withdraw from a vault
- **Sub-Account Transfer** — USD to/from sub-account
- **Sub-Account Spot Transfer** — spot tokens to/from sub-account
- **Create Sub-Account** — create a named sub-account
- **Place Order** — raw JSON input for order actions
- **Cancel Order** — cancel by asset index + order ID

## How it works

1. **Connect wallet** (Rabby or MetaMask via injected `window.ethereum`)
2. **Select action type** from the dropdown
3. **Fill in payload fields** — the EIP-712 preview updates live
4. **Sign** — wallet prompts for EIP-712 signature
5. **Copy/download** the signature JSON
6. **Coordinator** collects all signature JSONs, validates they match, and exports a bundle for the Python submit flow

## EIP-712 Spec

All constants are derived from the [official Hyperliquid Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk/blob/master/hyperliquid/utils/signing.py). For multisig operations, `payloadMultiSigUser` and `outerSigner` fields are injected after `hyperliquidChain` — matching the SDK's `add_multi_sig_types()` behavior.

**User-signed domain:** `HyperliquidSignTransaction`, chainId `421614` (0x66eee)

**L1 domain:** `Exchange`, chainId `1337` — uses msgpack + keccak256 phantom agent pattern

## Development

```bash
npm install
npm run dev
```

## Tech Stack

- React + TypeScript + Vite
- [viem](https://viem.sh) + [wagmi](https://wagmi.sh) for wallet connection and EIP-712 signing
- [@msgpack/msgpack](https://github.com/msgpack/msgpack-javascript) for L1 action hashing
- Tailwind CSS v4

## License

MIT
