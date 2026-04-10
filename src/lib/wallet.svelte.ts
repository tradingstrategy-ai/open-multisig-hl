import { createWalletClient, custom, type WalletClient } from 'viem'

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
	} catch (err) {
		error = err instanceof Error ? err.message : 'Connection failed'
	} finally {
		connecting = false
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
	}
	address = null
	connected = false
	client = null
	activeProvider = null
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
		get discoveredWallets() { return discoveredWallets },
		get showPicker() { return showPicker },
		set showPicker(v: boolean) { showPicker = v },
		connect,
		connectProvider,
		disconnect,
	}
}
