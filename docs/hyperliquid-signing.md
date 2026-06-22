# Hyperliquid signing modes

This document records the signing-mode decisions for this app. Do not change
an action from L1 to user-signed, or the reverse, without checking the SDK source
and repeating the relevant recovery/API probe.

## Two signing modes

Hyperliquid has two distinct signing families:

- **User-signed EIP-712**: actions such as `approveAgent`, `usdSend`,
  `spotSend`, `withdraw`, `usdClassTransfer`, `approveBuilderFee`,
  `tokenDelegate`, `convertToMultiSigUser`, and `sendAsset`. These use the
  `HyperliquidSignTransaction` domain and an action-specific
  `HyperliquidTransaction:*` primary type.
- **L1 actions**: actions such as `order`, `cancel`, `vaultTransfer`,
  `createVault`, `vaultModify`, `vaultDistribute`, `subAccountTransfer`,
  `subAccountSpotTransfer`, and `createSubAccount`. These are hashed with the
  Hyperliquid action hash and signed as `Exchange` / `Agent` typed data.

`L1` here means Hyperliquid's exchange action signing scheme, not an Ethereum
L1 RPC transaction. Do not add a fake chain 1337 network to a browser wallet.

## Vault and sub-account operations

Keep these actions in the L1 signing family:

- `vaultTransfer`: deposit USDC into a vault or withdraw USDC from a vault.
- `vaultModify`: change vault settings.
- `vaultDistribute`: distribute vault funds back to depositors.
- `subAccountTransfer`: move USDC to or from a sub-account.
- `subAccountSpotTransfer`: move spot tokens to or from a sub-account.
- `createSubAccount`: create a new named sub-account.

These actions are operational Hyperliquid exchange actions. They are not the
same user-signed family as `usdSend`, `spotSend`, `withdraw`, or
`approveAgent`. Browser-wallet success against a locally invented
`HyperliquidTransaction:*` schema is not evidence that Hyperliquid will accept
the submit.

## createVault decision

`createVault` is an L1 action.

References:

- nktkas TypeScript SDK `createVault.ts` marks `createVault` as
  `Signing: L1 Action` and calls `executeL1Action`.
  https://github.com/nktkas/hyperliquid/blob/main/src/api/exchange/_methods/createVault.ts
- The same SDK marks `approveAgent` as `Signing: User-Signed EIP-712` and calls
  `executeUserSignedAction`.
  https://github.com/nktkas/hyperliquid/blob/main/src/api/exchange/_methods/approveAgent.ts
- The same SDK marks `vaultTransfer` as `Signing: L1 Action`.
  https://github.com/nktkas/hyperliquid/blob/main/src/api/exchange/_methods/vaultTransfer.ts
- Hyperliquid documents API wallets/agents as keys approved to sign on behalf
  of the master account.
  https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets

## createVault test history

The user-signed `createVault` experiment was wrong:

- Browser wallets signed the local user-signed payload successfully.
- Local recovery matched the listed signers.
- Hyperliquid rejected the final multisig submit with
  `Invalid multi-sig inner signer`.
- Recovering those signatures against the SDK L1 digest returned different
  addresses. They were valid signatures over the wrong digest.

The SDK-correct direct multisig L1 browser path was also tested:

- The exact SDK inner payload was captured:
  `domain.name = Exchange`, `domain.chainId = 1337`,
  `primaryType = Agent`.
- Rabby rejected it before showing a useful signing path with:
  `chainId should be same as current chainId | -32602`.
- Do not retry fake chain switching or ask users to add chain 1337.

The base single-EOA L1 createVault path was validated:

- A disposable underfunded EOA signed SDK-correct L1 `createVault`.
- Hyperliquid returned `Insufficient balance to create vault`.
- Mutating the action after signing, or mutating the signature, returned
  recovered-signer errors instead of the balance error. This proves the
  insufficient-balance response happens after valid signer recovery.

The agent-wallet path was partially validated:

- A throwaway unapproved agent key signed SDK-correct single-agent L1
  `createVault`.
- Hyperliquid returned `User or API Wallet ... does not exist`, proving the
  server recovered the signer and reached API-wallet authorisation.
- The viable next path for browser multisigs that cannot sign `Exchange` /
  `Agent` directly is:
  1. Approve a generated agent wallet through multisig `approveAgent`.
  2. Verify the agent with a no-cost L1 action such as `noop`.
  3. Submit `createVault` signed by that approved agent.

The agent wallet is a separate revocable API key. It is not a multisig signer
private key, and it should be stored and rotated like any other trading agent
key.

## Action classification checklist

Before adding a new action:

1. Check the nktkas SDK method source for `Signing: L1 Action` or
   `Signing: User-Signed EIP-712`.
2. Check whether the SDK method calls `executeL1Action` or
   `executeUserSignedAction`.
3. If it is L1, ensure the action object is canonical and does not include
   user-signed fields such as `signatureChainId` or `hyperliquidChain`.
4. If it is user-signed, ensure the action includes the SDK's user-signed
   fields and the correct action-specific EIP-712 primary type.
5. For multisig submit, keep the outer `SendMultiSig` signature path unchanged:
   trim inner signature `r`/`s`, use the same nonce as the inner action, and
   commit to the same `outerSigner` in every inner signature.
