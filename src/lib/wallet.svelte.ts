import { createWalletClient, custom, type WalletClient } from 'viem'
import { CHAINS, toHexChainId } from './chains'

// EIP-6963 types
interface EIP6963ProviderInfo {
	uuid: string
	name: string
	icon: string // data URI
	rdns: string
}

interface EIP6963ProviderDetail {
	info: EIP6963ProviderInfo
	provider: {
		request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
		on: (event: string, handler: (...args: unknown[]) => void) => void
		removeListener: (event: string, handler: (...args: unknown[]) => void) => void
	}
}

// Discovered wallets via EIP-6963
let discoveredWallets = $state<EIP6963ProviderDetail[]>([])
let showPicker = $state(false)

// Active wallet state
let address = $state<string | null>(null)
let connected = $state(false)
let client = $state<WalletClient | null>(null)
let connecting = $state(false)
let error = $state<string | null>(null)
let activeProvider = $state<EIP6963ProviderDetail['provider'] | null>(null)
let chainId = $state<number | null>(null)
let switchingChain = $state(false)

function handleAccountsChanged(accounts: unknown[]) {
	if ((accounts as string[]).length === 0) {
		disconnect()
	} else {
		address = (accounts as string[])[0]
		if (activeProvider) {
			client = createWalletClient({
				account: address as `0x${string}`,
				transport: custom(activeProvider),
			})
		}
	}
}

function handleChainChanged(...args: unknown[]) {
	const raw = args[0]
	if (typeof raw === 'string') {
		const parsed = parseInt(raw, 16)
		chainId = Number.isFinite(parsed) ? parsed : null
	} else if (typeof raw === 'number') {
		chainId = raw
	}
}

async function refreshChainId() {
	if (!activeProvider) return
	try {
		const hex = (await activeProvider.request({ method: 'eth_chainId' })) as string
		const parsed = parseInt(hex, 16)
		chainId = Number.isFinite(parsed) ? parsed : null
	} catch {
		chainId = null
	}
}

async function connectProvider(detail: EIP6963ProviderDetail) {
	connecting = true
	error = null
	showPicker = false
	try {
		const accounts = (await detail.provider.request({
			method: 'eth_requestAccounts',
		})) as string[]
		if (accounts.length === 0) {
			error = 'No accounts returned'
			return
		}
		activeProvider = detail.provider
		address = accounts[0]
		connected = true
		client = createWalletClient({
			account: address as `0x${string}`,
			transport: custom(detail.provider),
		})
		detail.provider.on('accountsChanged', handleAccountsChanged)
		detail.provider.on('chainChanged', handleChainChanged)
		await refreshChainId()
	} catch (err) {
		error = err instanceof Error ? err.message : 'Connection failed'
	} finally {
		connecting = false
	}
}

/**
 * Ask the wallet to switch to a specific chain. If the wallet doesn't know the
 * chain yet (EIP-3326 error 4902) and we have local metadata for it in
 * `CHAINS`, fall back to `wallet_addEthereumChain`.
 */
async function switchChain(targetChainId: number): Promise<void> {
	if (!activeProvider) {
		throw new Error('No wallet connected')
	}
	switchingChain = true
	error = null
	try {
		try {
			await activeProvider.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: toHexChainId(targetChainId) }],
			})
		} catch (err: unknown) {
			// 4902: chain not recognised by the wallet. Offer to add it if known.
			const code = (err as { code?: number; data?: { originalError?: { code?: number } } })?.code
				?? (err as { data?: { originalError?: { code?: number } } })?.data?.originalError?.code
			if (code === 4902 && CHAINS[targetChainId]) {
				await activeProvider.request({
					method: 'wallet_addEthereumChain',
					params: [CHAINS[targetChainId]],
				})
			} else {
				throw err
			}
		}
		// `chainChanged` will fire and update our state, but refresh defensively
		// in case the wallet doesn't emit it.
		await refreshChainId()
	} catch (err) {
		error = err instanceof Error ? err.message : 'Chain switch failed'
		throw err
	} finally {
		switchingChain = false
	}
}

function connect() {
	error = null
	if (discoveredWallets.length === 0) {
		error = 'No wallet detected. Install MetaMask or Rabby.'
		return
	}
	if (discoveredWallets.length === 1) {
		connectProvider(discoveredWallets[0])
		return
	}
	// Multiple wallets — show picker
	showPicker = true
}

function disconnect() {
	if (activeProvider) {
		activeProvider.removeListener('accountsChanged', handleAccountsChanged)
		activeProvider.removeListener('chainChanged', handleChainChanged)
	}
	address = null
	connected = false
	client = null
	activeProvider = null
	chainId = null
}

// Start EIP-6963 discovery immediately (module-level, runs once)
if (typeof window !== 'undefined') {
	window.addEventListener('eip6963:announceProvider', (event: Event) => {
		const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail
		// Deduplicate by uuid
		if (!discoveredWallets.find((w) => w.info.uuid === detail.info.uuid)) {
			discoveredWallets = [...discoveredWallets, detail]
		}
	})
	window.dispatchEvent(new Event('eip6963:requestProvider'))
}

export function getWallet() {
	return {
		get address() { return address },
		get connected() { return connected },
		get client() { return client },
		get provider() { return activeProvider },
		get connecting() { return connecting },
		get error() { return error },
		get chainId() { return chainId },
		get switchingChain() { return switchingChain },
		get discoveredWallets() { return discoveredWallets },
		get showPicker() { return showPicker },
		set showPicker(v: boolean) { showPicker = v },
		connect,
		connectProvider,
		disconnect,
		switchChain,
	}
}
