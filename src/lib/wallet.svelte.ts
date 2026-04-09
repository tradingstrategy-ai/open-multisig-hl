import { createWalletClient, custom, type WalletClient } from 'viem'
import { arbitrumSepolia } from 'viem/chains'

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
			chain: arbitrumSepolia,
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
		const accounts = (await window.ethereum!.request({
			method: 'eth_requestAccounts',
		})) as string[]
		if (accounts.length === 0) {
			error = 'No accounts returned'
			return
		}
		address = accounts[0]
		connected = true
		client = createWalletClient({
			account: address as `0x${string}`,
			chain: arbitrumSepolia,
			transport: custom(window.ethereum!),
		})
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
		get address() {
			return address
		},
		get connected() {
			return connected
		},
		get client() {
			return client
		},
		get connecting() {
			return connecting
		},
		get error() {
			return error
		},
		connect,
		disconnect,
	}
}
