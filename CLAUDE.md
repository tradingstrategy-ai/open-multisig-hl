# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This application a web user interface for Hyperliquid native multisignature wallets (also known as Hypercore multisig).

## Language conventions

- Use UK/British English: `visualise` not `visualize`, `colour` not `color`
- For headings, only capitalise the first letter (not title case)

## Common commands

```shell
pnpm run dev              # Start development server
pnpm run build            # Build for production
pnpm run check            # Run Svelte type checking
pnpm run format           # Format code with Prettier
pnpm run lint             # Run ESLint and Prettier checks
pnpm run test:unit --run  # Run unit tests once
pnpm run test:integration # Run integration tests (requires build)
```

## Key conventions

**Svelte 5:**

- Use runes (`$state`, `$derived`, `$effect`, etc.)
- Async components supported (can use `await` in markup)
- Update legacy Svelte 4 syntax to runes when modifying components
- Run `pnpm run check` on modified files before committing (e.g., `pnpm run check src/lib/components/MyComponent.svelte`)

**TypeScript:**

- Strict mode enabled
- Schemas defined with Zod in `src/lib/schemas/` and `trade-executor/schemas/`

**Environment variables:**

- `TS_PUBLIC_` prefix for client-accessible values
- `TS_PRIVATE_` prefix for server-only values

**Formatting:**

- Prettier for all code formatting
- Run `pnpm run format` before committing

## Inline documentation

Svelte components should include a JSDoc comment at the beginning:

````svelte
<!--
@component
Brief description of the component.

- Markdown supported
- Include usage notes

@example

```svelte
  <MyComponent prop="value" />
```
-->
<script lang="ts">
	// ...
</script>
````

Page components should have a basic HTML comment:

```svelte
<!--
Brief page summary
-->
```

Functions should include multiline JSDoc comments with `@param` tags when warranted.

## Testing

- **Unit tests:** Components (except `+page`) and utilities - use Vitest
- **Integration tests:** `+page` components with mock API - use Playwright
- **E2E tests:** Smoke tests against production API - use Playwright

See `docs/tests.md` for detailed testing documentation.

## Browser automation

Prefer Playwright for browser-based validation in this repo when it is sufficient for the task.

Use it for:

- opening the local app
- taking screenshots
- checking rendered content
- reproducing layout and interaction issues

Typical local target:

```text
http://127.0.0.1:5173/
```

Use Chrome remote debugging MCP only when you specifically need to attach to an already running Chrome session, inspect the live DevTools state, or reuse a signed-in/manual browser context.

## Chrome remote debugging MCP

Does not work properly yet.

## Hyperliquid protocol gotchas

Hard-won lessons about the Hyperliquid multisig wire protocol. Violating any of these produces opaque errors.

**Signature trimming (outer action hash)**

The server strips leading zeros from inner signature `r` and `s` values before recomputing the `multiSig` action hash to verify the outer signer. You must do the same — trim before hashing, and send the trimmed values in the POST body. Sending raw (untrimmed) signatures causes the server's hash to diverge from yours, the outer sig recovers to the wrong address, and the server returns `"Invalid multi-sig outer signer"` with no further detail. This error message is misleading — the signer address and key are correct; only the hash input differs. See `trimSignature()` in `src/lib/execute.ts` and `trim_sig()` in `submit_multisig.py`.

**Outer nonce must match inner action nonce**

The top-level POST `nonce` and the `SendMultiSig` EIP-712 message `nonce` must be identical to the nonce field inside the inner action. Using `Date.now()` at submission time produces a mismatch; the server returns `"Nonce mismatch"`.

**Agent name length**

`approveAgent` enforces a 1–16 character limit on `agentName`. The server returns `"Extra agent name must be between 1 and 16 characters long"`.

**Nonce must be monotonically increasing**

Reusing or replaying a nonce lower than the last accepted one returns `"Invalid nonce: nonce too low"`. Always use a fresh timestamp after a failed submission.

**EIP712Domain must be explicit**

Rabby (and MetaMask internally via `@metamask/eth-sig-util`) computes a different domain separator when `EIP712Domain` is omitted from the `types` object. Always include it explicitly in both inner and outer `eth_signTypedData_v4` calls.

**createVault is L1, not user-signed**

`createVault` must stay in the Hyperliquid L1 `Exchange` / `Agent` signing family. The nktkas SDK marks it as `Signing: L1 Action` and calls `executeL1Action`. A user-signed `HyperliquidTransaction:CreateVault` experiment was tested: browser wallets signed it and local recovery matched, but Hyperliquid rejected the final submit with `"Invalid multi-sig inner signer"` because the signatures covered the wrong digest. See `docs/hyperliquid-signing.md` before changing any action's `signingMode`.

**Do not add fake chain 1337 to wallets**

The L1 signing domain uses EIP-712 `chainId: 1337` as part of Hyperliquid's exchange-action signing scheme. This is not an RPC chain this app should add to Rabby or MetaMask. Rabby was tested against the SDK-correct `Exchange` / `Agent` payload and rejected it with `"chainId should be same as current chainId"`. Do not repeat fake-network switching. For wallets that cannot sign the direct L1 multisig payload, use an approved API wallet / agent path or another provider that signs the SDK-correct payload.

## Pull requests

- Pull request description must have sections Why (the rational of change), Lessons learnt (memory for future agents) and Summary (what was changed). No test plan or verification section.
- Only push changes to remote when asked, never update pull requess automatically.
- Never push directly to a master if not told explicitly
- If the user ask to open a pull request as feature then start the PR title with "feat:" prefix and also add one line about the feature into `CHANGELOG.md`
- Each changelog entry should follow the date of the PR in YYYY-MM-DD format. Example: Something was updated (2026-01-01).
- Before opening or updating a pull request, format the code
- When merging pull request, squash and merge commits and use the PR description as the commit message
- If continuous integration (CI) tests fail on your PR, and they are marked flaky, run tests locally to repeat the issue if it is real flakiness or regression
