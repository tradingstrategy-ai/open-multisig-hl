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

const REQUIRED_CHAIN_ID = 421614 // Arbitrum Sepolia — matches Hyperliquid EIP-712 domain

async function switchToRequiredChain() {
	await window.ethereum!.request({
		method: 'wallet_switchEthereumChain',
		params: [{ chainId: '0x66eee' }],
	})
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

		// Check current chain and switch if needed
		const chainIdHex = (await window.ethereum!.request({ method: 'eth_chainId' })) as string
		const currentChainId = parseInt(chainIdHex, 16)
		if (currentChainId !== REQUIRED_CHAIN_ID) {
			try {
				await switchToRequiredChain()
			} catch (switchErr: unknown) {
				// Code 4902 = chain not added to wallet yet
				if ((switchErr as { code?: number }).code === 4902) {
					await window.ethereum!.request({
						method: 'wallet_addEthereumChain',
						params: [{
							chainId: '0x66eee',
							chainName: 'Arbitrum Sepolia',
							nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
							rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
							blockExplorerUrls: ['https://sepolia.arbiscan.io'],
						}],
					})
				} else {
					error = 'Please switch your wallet to Arbitrum Sepolia (chainId 421614) to sign.'
					return
				}
			}
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
