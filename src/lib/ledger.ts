import Eth from '@ledgerhq/hw-app-eth';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { domainSeparator } from 'viem';
import { hashStruct } from 'viem/utils';

export interface LedgerProgress {
	message: string;
	detail?: string;
}

export interface LedgerTypedData {
	domain: Record<string, unknown>;
	types: Record<string, { name: string; type: string }[]>;
	primaryType: string;
	message: Record<string, unknown>;
}

export interface LedgerTypedDataSignature {
	address: `0x${string}`;
	method: 'typed-data' | 'hashed-typed-data';
	signature: {
		r: `0x${string}`;
		s: `0x${string}`;
		v: number;
	};
}

export interface LedgerDerivedAddress {
	path: string;
	address: `0x${string}`;
}

export function isLedgerWebHidSupported(): boolean {
	return typeof navigator !== 'undefined' && 'hid' in navigator;
}

export async function fetchLedgerEthAddress(
	derivationPath: string,
	onProgress?: (progress: LedgerProgress) => void,
	verifyOnDevice = true,
): Promise<`0x${string}`> {
	const transport = await openLedgerTransport(onProgress);
	try {
		const eth = new Eth(transport);
		if (verifyOnDevice) {
			onProgress?.({
				message: 'Verify the address on your Ledger.',
				detail: derivationPath,
			});
		} else {
			onProgress?.({
				message: 'Deriving Ledger address.',
				detail: derivationPath,
			});
		}
		const output = await eth.getAddress(derivationPath, verifyOnDevice);
		return normalizeAddress(output.address, 'Ledger address');
	} finally {
		await transport.close();
	}
}

export async function fetchLedgerEthAddresses(
	derivationPaths: string[],
	onProgress?: (progress: LedgerProgress) => void,
): Promise<LedgerDerivedAddress[]> {
	const transport = await openLedgerTransport(onProgress);
	try {
		const eth = new Eth(transport);
		const derived: LedgerDerivedAddress[] = [];

		for (const path of derivationPaths) {
			onProgress?.({
				message: 'Scanning Ledger derivation paths.',
				detail: path,
			});
			const output = await eth.getAddress(path, false);
			derived.push({
				path,
				address: normalizeAddress(output.address, 'Ledger address'),
			});
		}

		return derived;
	} finally {
		await transport.close();
	}
}

export async function signLedgerEthTypedData(
	derivationPath: string,
	typedData: LedgerTypedData,
	onProgress?: (progress: LedgerProgress) => void,
): Promise<LedgerTypedDataSignature> {
	const transport = await openLedgerTransport(onProgress);
	try {
		const eth = new Eth(transport);
		const addressOutput = await eth.getAddress(derivationPath, false);
		const address = normalizeAddress(addressOutput.address, 'Ledger address');

		try {
			onProgress?.({
				message: 'Review and approve the full typed data on your Ledger.',
				detail: 'signEIP712Message',
			});
			const signature = await eth.signEIP712Message(
				derivationPath,
				typedData as Parameters<Eth['signEIP712Message']>[1],
			);
			return {
				address,
				method: 'typed-data',
				signature: normalizeSignature(signature),
			};
		} catch (fullTypedDataError) {
			onProgress?.({
				message: 'Full typed-data signing failed; trying Ledger hashed EIP-712 signing.',
				detail: formatLedgerError(fullTypedDataError).message,
			});

			const { domainHash, messageHash } = buildLedgerTypedDataHashes(typedData);
			onProgress?.({
				message: 'Review and approve the hashed EIP-712 payload on your Ledger.',
				detail: 'signEIP712HashedMessage',
			});
			const signature = await eth.signEIP712HashedMessage(
				derivationPath,
				stripHexPrefix(domainHash),
				stripHexPrefix(messageHash),
			);
			return {
				address,
				method: 'hashed-typed-data',
				signature: normalizeSignature(signature),
			};
		}
	} catch (error) {
		throw formatLedgerError(error);
	} finally {
		await transport.close();
	}
}

async function openLedgerTransport(
	onProgress?: (progress: LedgerProgress) => void,
): Promise<TransportWebHID> {
	if (!isLedgerWebHidSupported()) {
		throw new Error('Ledger WebHID is not available. Use Chrome or another WebHID-capable browser.');
	}

	onProgress?.({
		message: 'Select your Ledger device in the browser prompt.',
	});
	return TransportWebHID.request();
}

function buildLedgerTypedDataHashes(typedData: LedgerTypedData): {
	domainHash: `0x${string}`;
	messageHash: `0x${string}`;
} {
	const typesWithoutDomain = Object.fromEntries(
		Object.entries(typedData.types).filter(([typeName]) => typeName !== 'EIP712Domain'),
	);

	return {
		domainHash: domainSeparator({ domain: typedData.domain }),
		messageHash: hashStruct({
			data: typedData.message,
			primaryType: typedData.primaryType,
			types: typesWithoutDomain,
		}),
	};
}

function normalizeSignature(signature: { r: string; s: string; v: number }): {
	r: `0x${string}`;
	s: `0x${string}`;
	v: number;
} {
	return {
		r: normalizeHex(signature.r, 'signature.r'),
		s: normalizeHex(signature.s, 'signature.s'),
		v: signature.v < 27 ? signature.v + 27 : signature.v,
	};
}

function normalizeAddress(value: string, label: string): `0x${string}` {
	const normalized = normalizeHex(value, label).toLowerCase();
	if (normalized.length !== 42) {
		throw new Error(`${label} is not an Ethereum address: ${value}`);
	}
	return normalized as `0x${string}`;
}

function normalizeHex(value: string, label: string): `0x${string}` {
	const normalized = value.startsWith('0x') ? value : `0x${value}`;
	if (!/^0x[0-9a-fA-F]+$/.test(normalized)) {
		throw new Error(`${label} is not a hex string: ${value}`);
	}
	return normalized as `0x${string}`;
}

function stripHexPrefix(value: `0x${string}`): string {
	return value.slice(2);
}

function formatLedgerError(error: unknown): Error {
	if (error instanceof Error) return error;
	if (error && typeof error === 'object') {
		const maybe = error as { message?: unknown; name?: unknown; statusText?: unknown; statusCode?: unknown };
		const parts = [maybe.message, maybe.statusText, maybe.name, maybe.statusCode]
			.filter((part) => typeof part === 'string' || typeof part === 'number')
			.map(String);
		if (parts.length > 0) return new Error(parts.join(' | '));
		return new Error(JSON.stringify(error));
	}
	return new Error(String(error));
}
