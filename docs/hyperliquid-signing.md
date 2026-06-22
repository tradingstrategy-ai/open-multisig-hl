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
- MetaMask was also reported to reject the same SDK-correct L1 domain with
  `Provided chainId "1337" must match the active chainId "421614"`.
- Do not retry fake chain switching or ask users to add chain 1337.
- Do not change the L1 domain chain ID to `421614`. That only makes browser
  wallets willing to sign a different digest; Hyperliquid recovers signers from
  the canonical `Exchange` / `1337` digest.

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
- A later server-side test reported that an already approved agent wallet could
  sign `createVault`, but Hyperliquid returned
  `Insufficient balance to create vault` because the agent, not the funded
  multisig master, became the effective vault creator/leader for that request.
  Treat this as a reported operational result until independently reproduced in
  this repository.
- Do not assume an approved trading agent can create a vault for the multisig
  master. Agents are still useful for post-creation trading actions, but
  `createVault` must be treated as a multisig-master operation unless a
  successful live counterexample is recorded here.

The agent wallet is a separate revocable API key. It is not a multisig signer
private key, and it should be stored and rotated like any other trading agent
key.

## Browser-provider limitation for L1 multisig signatures

The current web UI can correctly build the L1 phantom-agent payload, but Rabby
and MetaMask injected providers reject the canonical `Exchange` / `1337`
typed-data domain before producing an inner signature.

This is a wallet-provider validation problem, not a Hyperliquid payload
construction problem. The app currently calls `eth_signTypedData_v4` through
`window.ethereum` for inner signatures. For L1 actions, that path cannot be the
only signing mechanism.

Do not repeat these failed workarounds:

- switching the wallet to a fake `1337` chain,
- adding a localhost `1337` RPC to the wallet,
- changing the EIP-712 domain chain ID from `1337` to `421614`,
- moving `createVault` to the user-signed `HyperliquidSignTransaction` family,
- asking multisig signers to share private keys with the coordinator.

The safe product direction is to keep the browser UI for coordination and final
aggregation, while adding a signer-side L1 signing mechanism that can produce
the canonical phantom-agent signature without going through Rabby/MetaMask's
chain-ID validation.

## Coordinator UI plan for L1 actions

The coordinator UI should separate four responsibilities.

1. Session creation:
   - The coordinator builds the action exactly once.
   - The shared session stores `actionType`, `multisigAddress`, `network`,
     `vaultAddress`, `fields`, `createdBy`, and `createdAt`.
   - For `createVault`, the action fields are `name`, `description`,
     `initialUsd`, and `nonce`.
   - The `createdBy` address is the outer signer that will submit the final
     multisig envelope. Every inner signer must commit to this same
     `outerSigner`.

2. Deterministic L1 preview:
   - The app builds the inner action object from the session.
   - For L1 actions, the app wraps the action as
     `[multiSigUser.lower(), outerSigner.lower(), action]`.
   - The app computes and displays/logs the L1 `connectionId` from the
     msgpack action hash, nonce, and optional vault marker.
   - The app displays the canonical typed-data domain:
     `Exchange`, version `1`, chainId `1337`, zero verifying contract.

3. Signature collection:
   - User-signed actions may continue using the browser wallet path.
   - L1 actions need a separate signer-side path. The current implementation
     target is Ledger Direct over WebHID using the Ledger Ethereum app, so the
     signer can approve the canonical EIP-712 payload on hardware without
     routing through Rabby/MetaMask provider validation.
   - A CLI signer may still be added later for operational recovery, but it
     must remain signer-local. The coordinator never receives a private key.
   - The UI should accept pasted signature JSON from each signer and verify
     that the payload, nonce, multisig user, and outer signer match the active
     session before adding it to the bundle.

4. Aggregation and submit:
   - The coordinator supplies at least the configured threshold of inner
     signatures.
   - The app trims leading zeroes from inner `r` and `s` values before hashing
     and submission.
   - The app builds the final action:
     `{ type: "multiSig", signatureChainId: "0x66eee", signatures, payload }`.
   - The outer signer signs the `SendMultiSig` wrapper through the normal
     user-signed browser-wallet path on `0x66eee`.
   - The app posts the final body to Hyperliquid's `/exchange` endpoint using
     the same nonce as the inner action.

## Implementation and test plan

Use the nktkas signing helpers where possible instead of maintaining parallel
hand-rolled signing logic:

- `canonicalize`
- `createL1ActionHash`
- `signL1Action`
- `signMultiSigL1`
- `signMultiSigUserSigned`

Implementation steps:

1. Add a small internal signing module that can build the canonical L1
   multisig payload and `connectionId` from a decoded session.
2. Add a Ledger Direct signer component for L1 session URLs:
   - connect over WebHID,
   - derive and optionally verify the expected signer address,
   - sign the canonical `Exchange` / `Agent` typed data,
   - output signer JSON containing `signer`, `signature`, `payload`,
     `connectionId`, `signerPath`, and `signingTransport`.
   - The first Ledger implementation using Ledger DMK failed in-browser with
     `UnknownDeviceExchangeError` before signing. Do not retry that path without
     a specific DMK fix. The active implementation uses the classic Ledger
     Ethereum stack:
     `@ledgerhq/hw-transport-webhid` + `@ledgerhq/hw-app-eth`.
   - The classic Ledger flow first tries `signEIP712Message`. If the device or
     Ethereum app cannot full-display the typed data, it falls back to
     `signEIP712HashedMessage` using the same EIP-712 domain separator and
     message hash. That fallback signs the same digest but may show less
     human-readable detail on-device.
3. Add UI paste/import validation for signer results:
   - matching `actionType`,
   - matching `multisigAddress`,
   - matching `outerSigner`,
   - matching `nonce`,
   - matching canonical `connectionId`,
   - signer address is one of the configured multisig authorised signers when
     that signer list is available.
4. Add a coordinator bundle preview that shows the final `multiSig` action
   before the outer signature.
5. Keep the outer signature and submit flow in the browser UI.
6. Optional later: add a signer-local CLI with the same output format as Ledger
   Direct for teams that need a non-browser fallback.

Test checkpoints:

1. Unit test that a fixed `createVault` session produces a stable inner action,
   envelope, and `connectionId`.
2. Unit test that changing `name`, `description`, `initialUsd`, `nonce`,
   `multiSigUser`, or `outerSigner` changes the `connectionId`.
3. Unit test that imported signature JSON with a mismatched session is rejected.
4. Local dry run that two signer result JSON objects assemble into one final
   `multiSig` submit body without mutating the inner action.
5. Live submit only after the local recovered signers and final request body
   are inspected.

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
