# Svelte 5 Rewrite + Session Coordination

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Hyperliquid multisig signer from React to Svelte 5 with shadcn-svelte and viem (no wagmi), and add a session coordination flow where the coordinator locks a payload, shares a URL, and signers sign from that link.

**Architecture:** SvelteKit app with shadcn-svelte UI components. Viem used directly with `window.ethereum` for wallet connection and EIP-712 signing (no wagmi wrapper). Session coordination via URL query param (`?s=base64payload`) so signers open a pre-filled, locked form. All cryptographic logic (eip712.ts, l1signing.ts) is preserved exactly from the React version. No backend. SSR disabled (wallet requires browser APIs).

**Tech Stack:** Svelte 5 (runes), SvelteKit, shadcn-svelte, viem, @msgpack/msgpack, Tailwind CSS

---

## MCP Servers — MUST USE during implementation

Three MCP servers are available and **must be used** at the specified points:

### 1. `svelte` MCP — Svelte 5 / SvelteKit docs + autofixer
- **`mcp__svelte__list-sections`** → Call FIRST for any Svelte question to find relevant doc sections
- **`mcp__svelte__get-documentation`** → Fetch docs for runes (`$state`, `$derived`, `$effect`, `$bindable`, `$props`), SvelteKit routing, `$app/state`, etc.
- **`mcp__svelte__svelte-autofixer`** → **MUST run on EVERY `.svelte` file before writing it.** Pass the component code and `desired_svelte_version: 5`. Fix all issues it reports before committing.

### 2. `shadcn-svelte` MCP — Component APIs and demos
- **`mcp__shadcn-svelte__list_components`** → Get the full list of available components
- **`mcp__shadcn-svelte__get_component_demo`** → **MUST call before using any shadcn component** (Button, Card, Input, Select, Alert, Badge, Tabs, Textarea, Separator). Get the exact import paths, prop names, and usage patterns. Do NOT guess imports.
- **`mcp__shadcn-svelte__get_component`** → Get source code if you need to understand internals or check available variants/props
- **`mcp__shadcn-svelte__list_themes`** / **`mcp__shadcn-svelte__apply_theme`** → Use to apply a dark theme preset after scaffolding

### 3. `evm-mcp-server` MCP — EVM blockchain interactions for testing
- **`mcp__evm-mcp-server__sign_typed_data`** → Use during Task 8 (integration testing) to generate reference signatures with the same EIP-712 payload and compare against browser-signed output. This validates that the frontend produces correct typed data.
- **`mcp__evm-mcp-server__get_wallet_address`** → Verify the test wallet address
- **`mcp__evm-mcp-server__get_chain_info`** → Verify chain IDs during development

### When to use each MCP (by task):

| Task | svelte MCP | shadcn-svelte MCP | evm MCP |
|------|-----------|-------------------|---------|
| 1. Scaffold | `get-documentation` for SvelteKit setup | `list_components`, `apply_theme` | — |
| 2. Port libs | — | — | — |
| 3. Wallet | `get-documentation` for `$state`, `$effect` | — | `get_wallet_address` to test |
| 4. Session | — | — | — |
| 5. Components | `svelte-autofixer` on EVERY component | `get_component_demo` for EVERY component used | — |
| 6. Main page | `svelte-autofixer`, `get-documentation` for `$app/state` | — | — |
| 7. Signer page | `svelte-autofixer` | — | — |
| 8. Testing | — | — | `sign_typed_data` to cross-verify |
| 9. Push | — | — | — |

---

## File Structure

```
open-multisig-hl/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── components.json                    # shadcn-svelte config
├── src/
│   ├── app.html                       # HTML shell
│   ├── app.css                        # Tailwind import
│   ├── lib/
│   │   ├── eip712.ts                  # PRESERVED: Domain, types, action registry, message builders
│   │   ├── l1signing.ts               # PRESERVED: Phantom agent, action hash, msgpack
│   │   ├── validation.ts              # PRESERVED: Address, nonce, field validation
│   │   ├── types.ts                   # PRESERVED: TypeScript interfaces (minor additions for sessions)
│   │   ├── wallet.svelte.ts           # NEW: Svelte 5 reactive wallet state via viem + window.ethereum
│   │   ├── session.ts                 # NEW: URL-based session encoding/decoding
│   │   └── components/
│   │       └── ui/                    # shadcn-svelte components (auto-generated)
│   └── routes/
│       ├── +layout.svelte             # Root layout (dark theme, fonts)
│       ├── +page.svelte               # Main app page (coordinator mode)
│       └── sign/
│           └── +page.svelte           # Signer mode (from shared URL)
└── static/
    └── favicon.png
```

### Key Design Decisions

1. **No wagmi** — viem used directly with `custom(window.ethereum)` transport. Svelte 5 runes (`$state`, `$derived`) replace React hooks for wallet state.
2. **Two routes** — `/` for coordinator (create + manage sessions), `/sign` for signers (from shared URL with `?s=base64payload`).
3. **lib/ files preserved** — `eip712.ts`, `l1signing.ts`, `validation.ts`, `types.ts` are copied from React version with zero logic changes. Only import paths change.
4. **Session encoding** — payload JSON → base64 in URL query param `?s=`. Typical payload ~300 bytes → ~400 chars base64. Well within URL limits.
6. **SSR disabled** — Both routes export `ssr = false` since wallet APIs require `window`. SvelteKit runs as an SPA.
5. **Signature collection** — signers copy their signature JSON. Coordinator pastes into the collector. Same as v1 but with the payload pre-filled from the URL.

---

## Task 1: Scaffold SvelteKit + shadcn-svelte project

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.css`
- Create: `components.json` (shadcn-svelte config)

- [ ] **Step 0: Fetch SvelteKit project setup docs**

```
MCP: mcp__svelte__get-documentation(section: "creating a project")
MCP: mcp__shadcn-svelte__list_components()
```

Review the docs for the correct scaffolding commands and available components.

- [ ] **Step 1: Create SvelteKit project**

```bash
cd ~/dev/tradingstrategies-ai/hl-multisig-signer
# Remove React source, keep docs/ and .git
rm -rf src/ node_modules/ dist/ package.json package-lock.json tsconfig* vite.config.ts eslint* index.html
# Scaffold SvelteKit in-place
npx sv create . --template minimal --types ts
npm install
```

- [ ] **Step 2: Install shadcn-svelte**

```bash
npx shadcn-svelte@latest init
# Select: Slate base color, default paths
```

- [ ] **Step 3: Add shadcn-svelte components we need**

```
MCP: mcp__shadcn-svelte__list_components()  — verify component names match
```

```bash
npx shadcn-svelte@latest add button select input card alert tabs badge separator textarea label
```

- [ ] **Step 4: Install viem and msgpack**

```bash
npm install viem @msgpack/msgpack
```

- [ ] **Step 5: Apply a dark theme**

```
MCP: mcp__shadcn-svelte__list_themes()  — pick a dark theme
MCP: mcp__shadcn-svelte__apply_theme(query: "dark")  — apply it
```

- [ ] **Step 6: Configure app.html**

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HL Multisig Signer</title>
  </head>
  <body class="min-h-screen bg-background text-foreground">
    <div>%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```
Expected: App loads at http://localhost:5173 with shadcn dark theme

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold SvelteKit + shadcn-svelte project"
```

---

## Task 2: Port core library files (eip712, l1signing, validation, types)

**Files:**
- Create: `src/lib/eip712.ts` (copy from React, no logic changes)
- Create: `src/lib/l1signing.ts` (copy from React, no logic changes)
- Create: `src/lib/validation.ts` (copy from React, no logic changes)
- Create: `src/lib/types.ts` (copy from React, add session types)

- [ ] **Step 1: Copy eip712.ts**

Copy `src/lib/eip712.ts` from the React app exactly as-is. This file has zero React dependencies — it's pure TypeScript with viem imports.

- [ ] **Step 2: Copy l1signing.ts**

Copy `src/lib/l1signing.ts` exactly as-is. Pure TypeScript with @msgpack/msgpack and viem imports.

- [ ] **Step 3: Copy validation.ts**

Copy `src/lib/validation.ts` exactly as-is. Pure TypeScript with viem isAddress import.

- [ ] **Step 4: Copy types.ts and add session types**

Copy `src/lib/types.ts` and add these types at the bottom:

```typescript
// Session — encoded in URL for sharing with signers
export interface Session {
  actionType: ActionType
  multisigAddress: string
  network: Network
  vaultAddress: string
  fields: Record<string, string>
  createdBy: string        // coordinator wallet address
  createdAt: number        // timestamp ms
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx svelte-check
```
Expected: No errors in lib/ files

- [ ] **Step 6: Commit**

```bash
git add src/lib/
git commit -m "feat: port core signing libraries (eip712, l1signing, validation, types)"
```

---

## Task 3: Wallet connection with viem (no wagmi)

**Files:**
- Create: `src/lib/wallet.svelte.ts`

- [ ] **Step 0: Fetch Svelte 5 runes documentation**

```
MCP: mcp__svelte__get-documentation(section: ["$state", "$derived", "$effect"])
```

Review how module-level `$state` works in `.svelte.ts` files.

- [ ] **Step 1: Create reactive wallet store using Svelte 5 runes**

```typescript
// src/lib/wallet.svelte.ts
import { createWalletClient, custom, type WalletClient } from 'viem'
import { arbitrum } from 'viem/chains'

// Reactive wallet state using Svelte 5 module-level runes
let address = $state<string | null>(null)
let connected = $state(false)
let client = $state<WalletClient | null>(null)
let connecting = $state(false)
let error = $state<string | null>(null)

function hasEthereum(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum
}

function handleAccountsChanged(accounts: string[]) {
  if (accounts.length === 0) {
    disconnect()
  } else {
    address = accounts[0]
    client = createWalletClient({
      account: address as `0x${string}`,
      chain: arbitrum,
      transport: custom(window.ethereum!),
    })
  }
}

async function connect() {
  if (!hasEthereum()) {
    error = 'No wallet detected. Install MetaMask or Rabby.'
    return
  }
  connecting = true
  error = null
  try {
    const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' }) as string[]
    if (accounts.length === 0) {
      error = 'No accounts returned'
      return
    }
    address = accounts[0]
    connected = true
    client = createWalletClient({
      account: address as `0x${string}`,
      chain: arbitrum,
      transport: custom(window.ethereum!),
    })
    // Listen for account changes (user switches wallet in MetaMask/Rabby)
    window.ethereum!.on('accountsChanged', handleAccountsChanged)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Connection failed'
  } finally {
    connecting = false
  }
}

function disconnect() {
  if (hasEthereum()) {
    window.ethereum!.removeListener('accountsChanged', handleAccountsChanged)
  }
  address = null
  connected = false
  client = null
}

export function getWallet() {
  return {
    get address() { return address },
    get connected() { return connected },
    get client() { return client },
    get connecting() { return connecting },
    get error() { return error },
    connect,
    disconnect,
  }
}
```

- [ ] **Step 2: Add ethereum type declaration**

Update `src/app.d.ts` — add `Window` augmentation inside `declare global` alongside SvelteKit's existing declarations:

```typescript
declare global {
  interface Window {
    ethereum?: import('viem').EIP1193Provider & {
      on(event: string, handler: (...args: any[]) => void): void
      removeListener(event: string, handler: (...args: any[]) => void): void
    }
  }
}

export {}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/wallet.svelte.ts src/app.d.ts
git commit -m "feat: add viem-based reactive wallet connection"
```

---

## Task 4: Session encoding/decoding for URL sharing

**Files:**
- Create: `src/lib/session.ts`

- [ ] **Step 1: Create session encoder/decoder**

```typescript
// src/lib/session.ts
import type { Session, FormValues } from './types'

// Encode session to URL-safe base64 for sharing
export function encodeSession(session: Session): string {
  const json = JSON.stringify(session)
  const bytes = new TextEncoder().encode(json)
  return btoa(String.fromCharCode(...bytes))
}

// Decode session from URL parameter
export function decodeSession(encoded: string): Session | null {
  try {
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json) as Session
  } catch {
    return null
  }
}

// Build a shareable URL from a session
export function buildShareUrl(session: Session): string {
  const encoded = encodeSession(session)
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/sign?s=${encoded}`
}

// Create a session from current form values
export function createSession(values: FormValues, createdBy: string): Session {
  return {
    actionType: values.actionType,
    multisigAddress: values.multisigAddress,
    network: values.network,
    vaultAddress: values.vaultAddress,
    fields: { ...values.fields },
    createdBy,
    createdAt: Date.now(),
  }
}

// Convert a session back to form values (for the signer page)
export function sessionToFormValues(session: Session): FormValues {
  return {
    actionType: session.actionType,
    multisigAddress: session.multisigAddress,
    network: session.network,
    vaultAddress: session.vaultAddress,
    fields: { ...session.fields },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/session.ts
git commit -m "feat: add URL-based session encoding for payload sharing"
```

---

## Task 5: Build UI components with shadcn-svelte

**CRITICAL MCP REQUIREMENTS FOR THIS TASK:**
1. Before using ANY shadcn component, call `mcp__shadcn-svelte__get_component_demo("component_name")` to get the exact import paths and usage
2. After writing EVERY `.svelte` file, call `mcp__svelte__svelte-autofixer` with the code and `desired_svelte_version: 5` — fix ALL reported issues before writing the file
3. For `$props`, `$bindable`, `$derived` usage, call `mcp__svelte__get-documentation` first if unsure

**Files:**
- Create: `src/lib/components/ConnectWallet.svelte`
- Create: `src/lib/components/WarningBanner.svelte`
- Create: `src/lib/components/PayloadForm.svelte`
- Create: `src/lib/components/EIP712Preview.svelte`
- Create: `src/lib/components/SignButton.svelte`
- Create: `src/lib/components/SignatureOutput.svelte`
- Create: `src/lib/components/CoordinatorHelper.svelte`
- Create: `src/lib/components/SessionShare.svelte`

- [ ] **Step 0: Fetch component demos for all shadcn components used**

```
MCP: mcp__shadcn-svelte__get_component_demo("button")
MCP: mcp__shadcn-svelte__get_component_demo("card")
MCP: mcp__shadcn-svelte__get_component_demo("input")
MCP: mcp__shadcn-svelte__get_component_demo("select")
MCP: mcp__shadcn-svelte__get_component_demo("alert")
MCP: mcp__shadcn-svelte__get_component_demo("badge")
MCP: mcp__shadcn-svelte__get_component_demo("textarea")
MCP: mcp__shadcn-svelte__get_component_demo("label")
MCP: mcp__svelte__get-documentation(section: ["$props", "$bindable"])
```

Review the exact import paths — do NOT guess. shadcn-svelte v4 may differ from v3.

- [ ] **Step 1: ConnectWallet.svelte**

Uses shadcn Button. Reads wallet state from `getWallet()`.

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { getWallet } from '$lib/wallet.svelte'

  const wallet = getWallet()
</script>

{#if wallet.connected && wallet.address}
  <div class="flex items-center gap-3 rounded-lg border border-green-800 bg-green-950/50 px-4 py-3">
    <div class="h-2.5 w-2.5 rounded-full bg-green-400"></div>
    <div class="flex-1 min-w-0">
      <div class="text-xs text-muted-foreground">Connected (outerSigner)</div>
      <div class="font-mono text-sm text-green-300 truncate">{wallet.address}</div>
    </div>
    <Button variant="outline" size="sm" onclick={() => wallet.disconnect()}>
      Disconnect
    </Button>
  </div>
{:else}
  <Button class="w-full" onclick={() => wallet.connect()} disabled={wallet.connecting}>
    {wallet.connecting ? 'Connecting...' : 'Connect Wallet'}
  </Button>
  {#if wallet.error}
    <p class="mt-2 text-xs text-destructive">{wallet.error}</p>
  {/if}
{/if}
```

> After writing each component: `MCP: mcp__svelte__svelte-autofixer(code: "<component code>", desired_svelte_version: 5)` — fix all issues before saving.

- [ ] **Step 2: WarningBanner.svelte**

```svelte
<script lang="ts">
  import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js'
</script>

<Alert class="border-yellow-700 bg-yellow-950/50">
  <AlertDescription class="text-yellow-200">
    <strong>Important:</strong> All signers must sign the exact same payload. Coordinate nonce
    values before signing. Changing any field invalidates previously collected signatures.
  </AlertDescription>
</Alert>
```

- [ ] **Step 3: PayloadForm.svelte**

Uses shadcn Input, Select, Button. Dynamic fields from ACTION_REGISTRY. Props: `values` (bindable), `errors`, `locked` (for signer mode).

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import * as Select from '$lib/components/ui/select/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import { getAllActions, getActionDef } from '$lib/eip712'
  import { validateField } from '$lib/validation'
  import type { ActionType, FormValues, Network } from '$lib/types'

  interface Props {
    values: FormValues
    errors: Record<string, string | null>
    locked?: boolean  // true when opened from shared URL
  }

  let { values = $bindable(), errors = $bindable(), locked = false }: Props = $props()

  const allActions = getAllActions()
  let actionDef = $derived(getActionDef(values.actionType))
  const userSignedActions = allActions.filter(a => a.signingMode === 'user-signed')
  const l1Actions = allActions.filter(a => a.signingMode === 'l1')

  function updateActionType(type: ActionType) {
    const newDef = getActionDef(type)
    const newFields: Record<string, string> = {}
    for (const f of newDef.fields) {
      newFields[f.name] = f.eip712Type === 'bool' ? 'false' : ''
    }
    values = { ...values, actionType: type, fields: newFields }
    errors = { multisigAddress: errors.multisigAddress }
  }

  function updateField(name: string, value: string) {
    values = { ...values, fields: { ...values.fields, [name]: value } }
    const fieldDef = actionDef.fields.find(f => f.name === name)
    if (fieldDef && value) {
      errors = { ...errors, [name]: validateField(value, fieldDef.eip712Type, fieldDef.required) }
    }
  }
</script>

<!-- Action type selector (disabled when locked) -->
<!-- Multisig address input -->
<!-- Dynamic fields from actionDef.fields -->
<!-- Network toggle -->
<!-- Implementation follows same patterns as React version but with Svelte syntax -->
```

Note: Full implementation follows the React PayloadForm patterns but uses Svelte `$bindable` props, `$derived` for actionDef, and shadcn components. The `locked` prop disables all inputs when viewing from a shared URL.

- [ ] **Step 4: EIP712Preview.svelte**

```svelte
<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
  import { buildSignTypedDataParams, getActionDef, DOMAIN } from '$lib/eip712'
  import { L1_DOMAIN } from '$lib/l1signing'
  import { validateForm, isFormValid } from '$lib/validation'
  import { getWallet } from '$lib/wallet.svelte'
  import type { FormValues } from '$lib/types'

  interface Props { values: FormValues }
  let { values }: Props = $props()

  const wallet = getWallet()
  const actionDef = $derived(getActionDef(values.actionType))
  const formErrors = $derived(validateForm(values, actionDef))
  const hasValidInputs = $derived(isFormValid(formErrors) && wallet.address)

  // serializeForDisplay helper — same as React version
  function serializeForDisplay(obj: unknown): unknown {
    if (typeof obj === 'bigint') return obj.toString()
    if (obj instanceof Uint8Array) return '0x' + Array.from(obj).map(b => b.toString(16).padStart(2, '0')).join('')
    if (Array.isArray(obj)) return obj.map(serializeForDisplay)
    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(obj)) result[k] = serializeForDisplay(v)
      return result
    }
    return obj
  }

  let preview = $derived.by(() => {
    if (!hasValidInputs) {
      const domain = actionDef.signingMode === 'l1' ? L1_DOMAIN : DOMAIN
      return { domain, primaryType: actionDef.signingMode === 'l1' ? 'Agent' : actionDef.primaryType, message: '(fill in form fields)' }
    }
    try {
      const params = buildSignTypedDataParams(values, wallet.address!)
      const serialized = serializeForDisplay(params) as object
      if (actionDef.signingMode === 'l1' && actionDef.buildAction) {
        return { _note: 'L1 phantom agent pattern', innerAction: serializeForDisplay(actionDef.buildAction(values.fields)), ...serialized as Record<string, unknown> }
      }
      return serialized
    } catch { return { error: 'Failed to build typed data' } }
  })
</script>

<pre class="rounded-lg border bg-muted p-4 text-xs font-mono overflow-auto max-h-[32rem]">
  {JSON.stringify(preview, null, 2)}
</pre>
```

- [ ] **Step 5: SignButton.svelte**

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'

  interface Props {
    disabled: boolean
    signing: boolean
    onclick: () => void
  }
  let { disabled, signing, onclick }: Props = $props()
</script>

<Button class="w-full text-lg py-6" {disabled} onclick={onclick}>
  {signing ? 'Waiting for wallet...' : 'Sign Payload'}
</Button>
```

- [ ] **Step 6: SignatureOutput.svelte**

Same as React version but with Svelte syntax. Uses shadcn Card, Button. Clipboard copy + file download.

- [ ] **Step 7: CoordinatorHelper.svelte**

Same parsing/validation/export logic as React version. Uses shadcn Card, Button, Textarea, Alert.

- [ ] **Step 8: SessionShare.svelte (NEW)**

This is the key new component. After filling the form, coordinator clicks "Create Signing Session" → gets a shareable URL.

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
  import { createSession, buildShareUrl } from '$lib/session'
  import { getWallet } from '$lib/wallet.svelte'
  import type { FormValues } from '$lib/types'

  interface Props {
    values: FormValues
    disabled: boolean
  }
  let { values, disabled }: Props = $props()

  const wallet = getWallet()
  let shareUrl = $state('')
  let copied = $state(false)

  function create() {
    if (!wallet.address) return
    const session = createSession(values, wallet.address)
    shareUrl = buildShareUrl(session)
  }

  async function copy() {
    await navigator.clipboard.writeText(shareUrl)
    copied = true
    setTimeout(() => copied = false, 2000)
  }
</script>

{#if !shareUrl}
  <Button class="w-full" variant="secondary" onclick={create} {disabled}>
    Create Signing Session (share link with signers)
  </Button>
{:else}
  <Card class="border-blue-800 bg-blue-950/20">
    <CardHeader>
      <CardTitle class="text-sm text-blue-300">Signing Session Created</CardTitle>
    </CardHeader>
    <CardContent class="space-y-3">
      <p class="text-xs text-muted-foreground">Share this link with all signers. They will see the locked payload and can sign directly.</p>
      <div class="flex gap-2">
        <Input value={shareUrl} readonly class="font-mono text-xs" />
        <Button variant="outline" size="sm" onclick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </CardContent>
  </Card>
{/if}
```

- [ ] **Step 9: Extract shared signing function**

Create `src/lib/signing.ts` to avoid duplicating signing logic between coordinator and signer pages:

```typescript
// src/lib/signing.ts
import { parseSignature, recoverTypedDataAddress, type WalletClient } from 'viem'
import { buildSignTypedDataParams, getActionDef } from './eip712'
import type { FormValues, SignatureResult } from './types'

export async function signMultisig(
  walletClient: WalletClient,
  walletAddress: string,
  values: FormValues,
): Promise<SignatureResult> {
  const params = buildSignTypedDataParams(values, walletAddress)
  const rawSig = await walletClient.signTypedData({
    account: walletAddress as `0x${string}`,
    domain: params.domain,
    types: params.types as Record<string, Array<{ name: string; type: string }>>,
    primaryType: params.primaryType,
    message: params.message as Record<string, unknown>,
  })
  const { r, s, v } = parseSignature(rawSig)
  const recovered = await recoverTypedDataAddress({
    domain: params.domain,
    types: params.types as Record<string, Array<{ name: string; type: string }>>,
    primaryType: params.primaryType,
    message: params.message as Record<string, unknown>,
    signature: rawSig,
  })
  if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error(`Recovery mismatch: expected ${walletAddress}, got ${recovered}`)
  }
  const actionDef = getActionDef(values.actionType)
  return {
    signer: walletAddress,
    signature: { r, s, v: Number(v) },
    payload: {
      type: values.actionType,
      signingMode: actionDef.signingMode,
      multisigAddress: values.multisigAddress,
      network: values.network,
      vaultAddress: values.vaultAddress,
      fields: { ...values.fields },
    },
  }
}
```

- [ ] **Step 10: Commit**

```bash
git add src/lib/components/ src/lib/signing.ts
git commit -m "feat: add all UI components with shadcn-svelte"
```

---

## Task 6: Main page (coordinator mode)

**Files:**
- Create: `src/routes/+layout.svelte`
- Create: `src/routes/+page.svelte`

- [ ] **Step 1: Root layout**

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css'
  let { children } = $props()
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  {@render children()}
</div>
```

- [ ] **Step 2: Main page — wires all components together**

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import ConnectWallet from '$lib/components/ConnectWallet.svelte'
  import WarningBanner from '$lib/components/WarningBanner.svelte'
  import PayloadForm from '$lib/components/PayloadForm.svelte'
  import EIP712Preview from '$lib/components/EIP712Preview.svelte'
  import SignButton from '$lib/components/SignButton.svelte'
  import SignatureOutput from '$lib/components/SignatureOutput.svelte'
  import CoordinatorHelper from '$lib/components/CoordinatorHelper.svelte'
  import SessionShare from '$lib/components/SessionShare.svelte'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
  import { getWallet } from '$lib/wallet.svelte'
  import { getActionDef } from '$lib/eip712'
  import { signMultisig } from '$lib/signing'
  import { validateForm, isFormValid } from '$lib/validation'
  import type { FormValues, SignatureResult } from '$lib/types'

  const wallet = getWallet()

  let values = $state<FormValues>({
    actionType: 'approveAgent',
    multisigAddress: '',
    network: 'Mainnet',
    vaultAddress: '',
    fields: { agentAddress: '', agentName: '', nonce: '' },
  })
  let errors = $state<Record<string, string | null>>({ multisigAddress: null })
  let result = $state<SignatureResult | null>(null)
  let signError = $state<string | null>(null)
  let signing = $state(false)

  let actionDef = $derived(getActionDef(values.actionType))
  let formErrors = $derived(validateForm(values, actionDef))
  let canSign = $derived(wallet.connected && isFormValid(formErrors))

  async function handleSign() {
    if (!wallet.client || !wallet.address) return
    signing = true; signError = null; result = null
    try {
      result = await signMultisig(wallet.client, wallet.address, values)
    } catch (err) {
      signError = err instanceof Error ? err.message : 'Signing failed'
    } finally {
      signing = false
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold">HL Multisig Signer</h1>
    <p class="text-sm text-muted-foreground mt-1">Sign Hyperliquid multisig transactions with Rabby or MetaMask</p>
  </div>

  <WarningBanner />

  <div class="grid gap-6 lg:grid-cols-2">
    <div class="space-y-4">
      <Card><CardHeader><CardTitle class="text-sm">1. Connect Wallet</CardTitle></CardHeader>
        <CardContent><ConnectWallet /></CardContent></Card>
      <Card><CardHeader><CardTitle class="text-sm">2. Payload</CardTitle></CardHeader>
        <CardContent><PayloadForm bind:values bind:errors /></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle class="text-sm">EIP-712 Preview</CardTitle></CardHeader>
      <CardContent><EIP712Preview {values} /></CardContent></Card>
  </div>

  <SessionShare {values} disabled={!canSign} />
  <SignButton disabled={!canSign} {signing} onclick={handleSign} />
  {#if signError}
    <div class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">{signError}</div>
  {/if}
  {#if result}<SignatureOutput {result} />{/if}
  <CoordinatorHelper />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/
git commit -m "feat: add main page with coordinator flow"
```

---

## Task 7: Signer page (from shared URL)

**Files:**
- Create: `src/routes/sign/+page.svelte`
- Create: `src/routes/sign/+page.ts` (SSR disable)

- [ ] **Step 1: Disable SSR for signer route**

Create `src/routes/sign/+page.ts`:

```typescript
export const ssr = false
```

Also create `src/routes/+page.ts` for the main route:

```typescript
export const ssr = false
```

- [ ] **Step 2: Create signer page**

This page reads the `?s=` query param, decodes the session, and shows the form in locked mode. Uses `$state` (not `$derived`) for `values` since `$derived` is read-only and cannot be bound. Uses `page` from `$app/state` (SvelteKit 2 / Svelte 5 modern API). Uses shared `signMultisig()` function.

```svelte
<!-- src/routes/sign/+page.svelte -->
<script lang="ts">
  import { page } from '$app/state'
  import { decodeSession, sessionToFormValues } from '$lib/session'
  import ConnectWallet from '$lib/components/ConnectWallet.svelte'
  import PayloadForm from '$lib/components/PayloadForm.svelte'
  import EIP712Preview from '$lib/components/EIP712Preview.svelte'
  import SignButton from '$lib/components/SignButton.svelte'
  import SignatureOutput from '$lib/components/SignatureOutput.svelte'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js'
  import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js'
  import { getWallet } from '$lib/wallet.svelte'
  import { getActionDef } from '$lib/eip712'
  import { signMultisig } from '$lib/signing'
  import { validateForm, isFormValid } from '$lib/validation'
  import type { FormValues, SignatureResult } from '$lib/types'

  const wallet = getWallet()

  // Decode session from URL — use $state so PayloadForm can bind to it
  const encoded = page.url.searchParams.get('s') || ''
  const session = encoded ? decodeSession(encoded) : null
  // $state (not $derived) because PayloadForm uses bind:values
  // Values are initialized once from session and stay locked
  let values = $state<FormValues | null>(session ? sessionToFormValues(session) : null)
  let errors = $state<Record<string, string | null>>({})

  let result = $state<SignatureResult | null>(null)
  let signError = $state<string | null>(null)
  let signing = $state(false)

  let actionDef = $derived(values ? getActionDef(values.actionType) : null)
  let formErrors = $derived(values && actionDef ? validateForm(values, actionDef) : {})
  let canSign = $derived(wallet.connected && values && isFormValid(formErrors))

  async function handleSign() {
    if (!wallet.client || !wallet.address || !values) return
    signing = true; signError = null; result = null
    try {
      result = await signMultisig(wallet.client, wallet.address, values)
    } catch (err) {
      signError = err instanceof Error ? err.message : 'Signing failed'
    } finally {
      signing = false
    }
  }
</script>

{#if !session || !values}
  <Alert variant="destructive"><AlertDescription>Invalid or missing session. Ask the coordinator for a new link.</AlertDescription></Alert>
{:else}
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">Sign Multisig Transaction</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Session created by <span class="font-mono">{session.createdBy.slice(0, 10)}...</span>
        on {new Date(session.createdAt).toLocaleString()}
      </p>
    </div>

    <Alert class="border-blue-800 bg-blue-950/50">
      <AlertDescription class="text-blue-200">
        This payload is locked by the coordinator. Connect your wallet and sign below.
      </AlertDescription>
    </Alert>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-4">
        <Card><CardHeader><CardTitle class="text-sm">1. Connect Wallet</CardTitle></CardHeader>
          <CardContent><ConnectWallet /></CardContent></Card>
        <Card><CardHeader><CardTitle class="text-sm">2. Payload (locked)</CardTitle></CardHeader>
          <CardContent><PayloadForm bind:values={values} bind:errors locked /></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle class="text-sm">EIP-712 Preview</CardTitle></CardHeader>
        <CardContent><EIP712Preview {values} /></CardContent></Card>
    </div>

    <SignButton disabled={!canSign} {signing} onclick={handleSign} />
    {#if signError}<div class="rounded-md border border-destructive px-4 py-3 text-sm text-destructive">{signError}</div>{/if}
    {#if result}<SignatureOutput {result} />{/if}
  </div>
{/if}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/sign/
git commit -m "feat: add signer page with locked payload from shared URL"
```

---

## Task 8: Integration testing and polish

**Files:**
- Modify: Various components for final fixes

- [ ] **Step 0: Cross-verify EIP-712 signing with evm MCP**

Use the evm MCP server to generate a reference signature for the same typed data the frontend builds, and verify the structures match:

```
MCP: mcp__evm-mcp-server__get_wallet_address()  — get the test wallet address
MCP: mcp__evm-mcp-server__sign_typed_data(...)   — sign the same approveAgent payload
```

Compare the domain, types, primaryType, and message fields with what the frontend's `buildSignTypedDataParams()` produces. If they differ, the frontend has a bug.

- [ ] **Step 1: Run dev server and test coordinator flow**

```bash
npm run dev
```

Test:
1. Open http://localhost:5173
2. Connect wallet
3. Fill in approveAgent fields
4. Click "Create Signing Session" → get URL
5. Open URL in new tab → verify payload is locked
6. Sign in both tabs → verify JSON output matches
7. Test coordinator helper: paste both JSONs, validate, export bundle

- [ ] **Step 2: Run build**

```bash
npm run build
```
Expected: No errors

- [ ] **Step 3: Test all action types in dropdown**

Verify all 15 action types render correct fields and switch cleanly.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration testing fixes"
```

---

## Task 9: Push to GitHub

**Files:** None (git operations only)

- [ ] **Step 1: Update remote to point to new repo**

```bash
git remote set-url origin https://github.com/tradingstrategy-ai/open-multisig-hl.git
```

- [ ] **Step 2: Force push new Svelte version to main**

⚠️ This replaces the React version. Confirm with user first.

```bash
git push origin main --force
```

- [ ] **Step 3: Verify on GitHub**

Open https://github.com/tradingstrategy-ai/open-multisig-hl and verify the code is correct.

---

## Verification Checklist

- [ ] `npm run dev` starts without errors
- [ ] `npm run build` completes without errors
- [ ] Wallet connects with MetaMask/Rabby
- [ ] All 15 action types render correct form fields
- [ ] EIP-712 preview updates live
- [ ] Signing produces valid r/s/v output
- [ ] Signature recovery check passes
- [ ] "Create Signing Session" generates shareable URL
- [ ] Opening shared URL shows locked payload
- [ ] Signer can sign from shared URL
- [ ] Coordinator helper validates and bundles signatures
- [ ] Copy/download buttons work
