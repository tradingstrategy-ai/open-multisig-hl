/**
 * Reactive wallet store backed by AppKit + wagmi.
 *
 * The previous implementation used raw EIP-6963 discovery, which only
 * surfaced browser-extension wallets. This rewrite delegates discovery and
 * connection to AppKit's modal so WalletConnect-bridged mobile wallets work
 * in addition to the existing browser-extension flow.
 *
 * The public `getWallet()` interface is intentionally unchanged so downstream
 * components (signing.ts, l1signing.ts, execute.ts, ConnectWallet.svelte,
 * WrongChainAlert.svelte, …) keep working without modification.
 */

import { browser } from '$app/environment'
import {
	getAccount,
	watchAccount,
	reconnect,
	disconnect as wagmiDisconnect,
	switchChain as wagmiSwitchChain,
	type GetAccountReturnType,
} from '@wagmi/core'
import { createWalletClient, custom, type WalletClient } from 'viem'
import { config, modal } from './wallet/client'

/**
 * EIP-1193 provider — minimal shape needed by signing.ts / l1signing.ts /
 * execute.ts. Wagmi connectors all expose `getProvider()` returning an object
 * with this shape, regardless of the underlying transport (injected, WC, etc.).
 */
type EIP1193Provider = {
	request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
	on?: (event: string, handler: (...args: unknown[]) => void) => void
	removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

let address = $state<string | null>(null)
let connected = $state(false)
let client = $state<WalletClient | null>(null)
let provider = $state<EIP1193Provider | null>(null)
let chainId = $state<number | null>(null)
let connecting = $state(false)
let switchingChain = $state(false)
let error = $state<string | null>(null)

let providerSyncToken = 0

async function syncFromAccount(account: GetAccountReturnType) {
	address = account.address ?? null
	connected = account.status === 'connected'
	chainId = account.chainId ?? null

	// Resolve the EIP-1193 provider from the active connector. Bail out if a
	// newer sync started while we were awaiting (avoids race-condition writes
	// when the user disconnects/reconnects rapidly).
	const token = ++providerSyncToken
	if (account.connector && account.address) {
		try {
			const p = (await account.connector.getProvider()) as EIP1193Provider
			if (token !== providerSyncToken) return
			provider = p
			client = createWalletClient({
				account: account.address as `0x${string}`,
				transport: custom(p),
			})
		} catch {
			if (token !== providerSyncToken) return
			provider = null
			client = null
		}
	} else {
		provider = null
		client = null
	}
}

if (browser) {
	void syncFromAccount(getAccount(config))
	watchAccount(config, { onChange: (account) => void syncFromAccount(account) })
	// Restore previous session on full page load (e.g. coordinator paste flow
	// after a reload). reconnect() is a no-op when no prior session exists.
	void reconnect(config).catch(() => {})
}

function connect() {
	error = null
	connecting = true
	try {
		modal.open({ view: 'Connect' })
	} catch (err) {
		error = err instanceof Error ? err.message : 'Connection failed'
	} finally {
		// Modal is now responsible for the connection UX; flip the flag back so
		// the trigger button isn't stuck in a "Connecting…" state. Real account
		// state propagates via watchAccount above.
		connecting = false
	}
}

async function disconnect() {
	error = null
	try {
		await wagmiDisconnect(config)
	} catch (err) {
		error = err instanceof Error ? err.message : 'Disconnect failed'
	}
}

/**
 * Ask the wallet to switch to a specific chain.
 *
 * Wagmi handles wallet_switchEthereumChain + wallet_addEthereumChain internally
 * for chains in the AppKit network list, so we no longer need the manual 4902
 * fallback that lived in the previous EIP-6963 implementation.
 */
async function switchChain(targetChainId: number): Promise<void> {
	switchingChain = true
	error = null
	try {
		await wagmiSwitchChain(config, { chainId: targetChainId })
	} catch (err) {
		error = err instanceof Error ? err.message : 'Chain switch failed'
		throw err
	} finally {
		switchingChain = false
	}
}

export function getWallet() {
	return {
		get address() {
			return address
		},
		get connected() {
			return connected
		},
		get client() {
			return client
		},
		get provider() {
			return provider
		},
		get connecting() {
			return connecting
		},
		get error() {
			return error
		},
		get chainId() {
			return chainId
		},
		get switchingChain() {
			return switchingChain
		},
		connect,
		disconnect,
		switchChain,
	}
}
