/**
 * Execute a collected multisig bundle by posting it to the Hyperliquid exchange API.
 *
 * Mirrors the Python SDK's Exchange.multi_sig() method:
 * https://github.com/hyperliquid-dex/hyperliquid-python-sdk/blob/master/hyperliquid/exchange.py
 */

import { encode } from '@msgpack/msgpack'
import { keccak256 } from 'viem'
import type { CoordinatorBundle, Network } from './types'

const MAINNET_EXCHANGE = 'https://api.hyperliquid.xyz/exchange'
const TESTNET_EXCHANGE = 'https://api.hyperliquid-testnet.xyz/exchange'

type Provider = {
	request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2)
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
	}
	return bytes
}

/**
 * Compute action hash for the multiSig envelope.
 * Matches Python SDK: action_hash(action_without_tag, vault_address, nonce)
 */
function multiSigActionHash(
	actionWithoutType: Record<string, unknown>,
	vaultAddress: string | null,
	nonce: number,
): `0x${string}` {
	const packed = encode(actionWithoutType)

	const nonceBytes = new Uint8Array(8)
	const view = new DataView(nonceBytes.buffer)
	view.setUint32(0, Math.floor(nonce / 0x100000000))
	view.setUint32(4, nonce >>> 0)

	let vaultBytes: Uint8Array
	if (vaultAddress) {
		const addrHex = vaultAddress.startsWith('0x') ? vaultAddress.slice(2) : vaultAddress
		const addrBytes = hexToBytes(addrHex)
		vaultBytes = new Uint8Array(1 + 20)
		vaultBytes[0] = 0x01
		vaultBytes.set(addrBytes, 1)
	} else {
		vaultBytes = new Uint8Array([0x00])
	}

	const combined = new Uint8Array(packed.length + nonceBytes.length + vaultBytes.length)
	combined.set(packed, 0)
	combined.set(nonceBytes, packed.length)
	combined.set(vaultBytes, packed.length + nonceBytes.length)

	return keccak256(combined)
}

/**
 * Sign the outer multiSig envelope using eth_signTypedData_v4.
 * Matches Python SDK: sign_multi_sig_action()
 */
async function signMultiSigEnvelope(
	provider: Provider,
	outerSigner: string,
	actionWithoutType: Record<string, unknown>,
	vaultAddress: string | null,
	nonce: number,
	network: Network,
): Promise<{ r: string; s: string; v: number }> {
	const hashHex = multiSigActionHash(actionWithoutType, vaultAddress, nonce)

	// EIP712Domain MUST be explicitly included in types. Without it,
	// @metamask/eth-sig-util (used by Rabby and other wallets internally)
	// computes a different domain separator than when it's present.
	// The Python SDK always includes it. See PR #7 for the same fix on inner signing.
	const typedData = {
		domain: {
			name: 'HyperliquidSignTransaction',
			version: '1',
			chainId: 421614,
			verifyingContract: '0x0000000000000000000000000000000000000000',
		},
		types: {
			EIP712Domain: [
				{ name: 'name', type: 'string' },
				{ name: 'version', type: 'string' },
				{ name: 'chainId', type: 'uint256' },
				{ name: 'verifyingContract', type: 'address' },
			],
			'HyperliquidTransaction:SendMultiSig': [
				{ name: 'hyperliquidChain', type: 'string' },
				{ name: 'multiSigActionHash', type: 'bytes32' },
				{ name: 'nonce', type: 'uint64' },
			],
		},
		primaryType: 'HyperliquidTransaction:SendMultiSig',
		message: {
			hyperliquidChain: network === 'Mainnet' ? 'Mainnet' : 'Testnet',
			multiSigActionHash: hashHex,
			nonce,
		},
	}

	// Switch to Arbitrum Sepolia — wallets enforce domain.chainId match.
	try {
		await provider.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: '0x66eee' }],
		})
	} catch (switchErr: unknown) {
		const code =
			(switchErr as { code?: number })?.code ??
			(switchErr as { data?: { originalError?: { code?: number } } })?.data?.originalError?.code
		if (code === 4902) {
			await provider.request({
				method: 'wallet_addEthereumChain',
				params: [
					{
						chainId: '0x66eee',
						chainName: 'Arbitrum Sepolia',
						nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
						rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
						blockExplorerUrls: ['https://sepolia.arbiscan.io'],
					},
				],
			})
		} else {
			throw new Error('Please switch your wallet to Arbitrum Sepolia (chain 421614) before executing.')
		}
	}

	const rawSig = (await provider.request({
		method: 'eth_signTypedData_v4',
		params: [outerSigner, JSON.stringify(typedData)],
	})) as `0x${string}`

	const r = '0x' + rawSig.slice(2, 66)
	const s = '0x' + rawSig.slice(66, 130)
	const v = parseInt(rawSig.slice(130, 132), 16)

	return { r, s, v }
}

export interface ExecuteResult {
	success: boolean
	response: unknown
	requestBody: unknown
}

/**
 * Execute a collected multisig bundle on the Hyperliquid exchange.
 * Mirrors Python SDK's Exchange.multi_sig().
 */
export async function executeBundle(
	provider: Provider,
	outerSigner: string,
	bundle: CoordinatorBundle,
	vaultAddress: string | null,
): Promise<ExecuteResult> {
	// The outer nonce must match the inner action's nonce field.
	// Hyperliquid rejects with "Nonce mismatch" if they differ.
	const nonce = bundle.nonce
	const isMainnet = bundle.network === 'Mainnet'
	const exchangeUrl = isMainnet ? MAINNET_EXCHANGE : TESTNET_EXCHANGE

	const multiSigAction = {
		type: 'multiSig',
		signatureChainId: '0x66eee',
		signatures: bundle.signatures,
		payload: {
			multiSigUser: bundle.multisig_user.toLowerCase(),
			outerSigner: outerSigner.toLowerCase(),
			action: bundle.inner_action,
		},
	}

	const { type: _type, ...actionWithoutType } = multiSigAction
	const outerSignature = await signMultiSigEnvelope(
		provider,
		outerSigner,
		actionWithoutType,
		vaultAddress,
		nonce,
		bundle.network,
	)

	const requestBody: Record<string, unknown> = {
		action: multiSigAction,
		nonce,
		signature: outerSignature,
		vaultAddress: vaultAddress ?? null,
		expiresAfter: null,
	}

	const res = await fetch(exchangeUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody),
	})

	const text = await res.text()
	let response: unknown
	try {
		response = JSON.parse(text)
	} catch {
		response = text
	}
	const success = res.ok && (response as { status?: string })?.status === 'ok'

	return { success, response, requestBody }
}
