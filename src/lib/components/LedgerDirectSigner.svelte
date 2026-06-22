<script lang="ts">
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SignatureOutput from '$lib/components/SignatureOutput.svelte';
	import { getActionDef } from '$lib/eip712.js';
	import { buildL1FormSigningContext } from '$lib/l1context.js';
	import {
		fetchLedgerEthAddress,
		fetchLedgerEthAddresses,
		isLedgerWebHidSupported,
		signLedgerEthTypedData,
		type LedgerTypedData,
		type LedgerProgress,
	} from '$lib/ledger.js';
	import type { FormValues, SignatureResult } from '$lib/types.js';

	interface Props {
		values: FormValues;
		outerSigner: string;
		expectedSignerAddress?: string;
	}

	let { values, outerSigner, expectedSignerAddress = '' }: Props = $props();

	let derivationPath = $state("44'/60'/0'/0/0");
	let expectedSigner = $state('');
	let derivedAddress = $state<`0x${string}` | null>(null);
	let progress = $state<LedgerProgress | null>(null);
	let error = $state<string | null>(null);
	let result = $state<SignatureResult | null>(null);
	let deriving = $state(false);
	let scanning = $state(false);
	let signing = $state(false);

	const actionDef = $derived(getActionDef(values.actionType));
	const ledgerSupported = $derived(isLedgerWebHidSupported());
	const l1Context = $derived.by(() => {
		try {
			return buildL1FormSigningContext(values, outerSigner);
		} catch {
			return null;
		}
	});
	const expectedSignerMismatch = $derived(
		Boolean(
			expectedSigner.trim() &&
			derivedAddress &&
			expectedSigner.trim().toLowerCase() !== derivedAddress.toLowerCase(),
		),
	);
	const canSignWithLedger = $derived(
		Boolean(
			ledgerSupported &&
				l1Context &&
				expectedSigner.trim() &&
				derivedAddress &&
				!expectedSignerMismatch &&
				!signing &&
				!deriving &&
				!scanning,
		),
	);

	$effect(() => {
		if (!expectedSigner.trim() && expectedSignerAddress) {
			expectedSigner = expectedSignerAddress;
		}
	});

	function formatError(err: unknown): string {
		console.error('Ledger signing failed:', err);
		return err instanceof Error ? err.message : String(err);
	}

	async function deriveAddress() {
		deriving = true;
		error = null;
		result = null;
		progress = null;
		derivedAddress = null;
		try {
			derivedAddress = await fetchLedgerEthAddress(derivationPath, (nextProgress) => {
				progress = nextProgress;
			});
			progress = { message: 'Ledger address derived.' };
		} catch (err) {
			error = formatError(err);
		} finally {
			deriving = false;
		}
	}

	function commonLedgerPaths(): string[] {
		const paths = new Set<string>();
		for (let index = 0; index < 10; index += 1) {
			paths.add(`44'/60'/${index}'/0/0`);
			paths.add(`44'/60'/0'/0/${index}`);
			paths.add(`44'/60'/0'/${index}`);
		}
		return Array.from(paths);
	}

	async function scanForExpectedSigner() {
		const target = expectedSigner.trim().toLowerCase();
		if (!target) {
			error = 'Enter the expected signer address before scanning Ledger paths.';
			return;
		}

		scanning = true;
		error = null;
		result = null;
		progress = null;
		derivedAddress = null;
		try {
			const derived = await fetchLedgerEthAddresses(commonLedgerPaths(), (nextProgress) => {
				progress = nextProgress;
			});
			const match = derived.find((entry) => entry.address.toLowerCase() === target);
			if (!match) {
				const firstFew = derived
					.slice(0, 5)
					.map((entry) => `${entry.path} -> ${entry.address}`)
					.join('\n');
				throw new Error(`Expected signer was not found in the common Ledger paths scanned. First derived addresses:\n${firstFew}`);
			}

			derivationPath = match.path;
			derivedAddress = match.address;
			progress = {
				message: 'Matched expected signer. Verify this address before signing.',
				detail: match.path,
			};
		} catch (err) {
			error = formatError(err);
		} finally {
			scanning = false;
		}
	}

	async function signWithLedger() {
		if (!l1Context) {
			error = 'The L1 signing context could not be built. Check the payload fields.';
			return;
		}
		if (!expectedSigner.trim()) {
			error = 'Enter the expected multisig signer address before signing.';
			return;
		}
		if (!derivedAddress) {
			error = 'Verify the Ledger address or find the expected signer path before signing.';
			return;
		}
		if (expectedSignerMismatch) {
			error = 'The derived Ledger address does not match the expected signer.';
			return;
		}

		signing = true;
		error = null;
		result = null;
		progress = null;
		try {
			const signed = await signLedgerEthTypedData(
				derivationPath,
				JSON.parse(JSON.stringify(l1Context.typedData)) as LedgerTypedData,
				(nextProgress) => {
					progress = nextProgress;
				},
			);
			derivedAddress = signed.address;

			if (
				expectedSigner.trim() &&
				expectedSigner.trim().toLowerCase() !== signed.address.toLowerCase()
			) {
				throw new Error(`Ledger signer ${signed.address} does not match expected signer ${expectedSigner.trim()}.`);
			}

			result = {
				signer: signed.address,
				connectionId: l1Context.connectionId,
				signerPath: derivationPath,
				signingTransport: 'ledger-eth',
				signingMethod: signed.method,
				signature: signed.signature,
				payload: {
					type: values.actionType,
					signingMode: actionDef.signingMode,
					multisigAddress: values.multisigAddress,
					outerSigner,
					network: values.network,
					vaultAddress: values.vaultAddress,
					fields: values.fields,
				},
			};
			progress = { message: 'Ledger signature created.' };
		} catch (err) {
			error = formatError(err);
		} finally {
			signing = false;
		}
	}
</script>

<Card class="border-blue-800/50">
	<CardHeader>
		<CardTitle class="text-sm">Ledger Direct L1 Signing</CardTitle>
	</CardHeader>
	<CardContent class="space-y-4">
		<Alert class="border-blue-800 bg-blue-950/50">
			<AlertDescription class="space-y-2 text-blue-200">
				<p>
					This L1 action signs Hyperliquid's fixed Exchange / Agent domain directly on
					the Ledger. Use this when Rabby or MetaMask reject the L1 domain before
					showing a signing prompt.
				</p>
				<p class="font-mono text-[0.65rem]">
					connectionId: {l1Context?.connectionId ?? 'pending'}
				</p>
			</AlertDescription>
		</Alert>

		{#if !ledgerSupported}
			<Alert variant="destructive">
				<AlertDescription>
					WebHID is not available in this browser. Use Chrome or another browser with
					Ledger WebHID support.
				</AlertDescription>
			</Alert>
		{/if}

		<div class="grid gap-3 md:grid-cols-2">
			<label class="space-y-1 text-xs">
				<span class="text-muted-foreground">Derivation Path</span>
				<Input bind:value={derivationPath} class="font-mono" />
			</label>
			<label class="space-y-1 text-xs">
				<span class="text-muted-foreground">Expected Signer</span>
				<Input bind:value={expectedSigner} placeholder="0x..." class="font-mono" />
				{#if expectedSignerAddress}
					<div class="text-muted-foreground text-[0.65rem]">
						Prefilled from connected wallet.
					</div>
				{/if}
			</label>
		</div>

		{#if derivedAddress}
			<div class="rounded-md border border-border p-3">
				<div class="text-muted-foreground text-xs">Ledger signer</div>
				<div class="break-all font-mono text-xs">{derivedAddress}</div>
			</div>
		{/if}

		{#if expectedSignerMismatch}
			<Alert variant="destructive">
				<AlertDescription>
					The derived Ledger address does not match the expected signer.
				</AlertDescription>
			</Alert>
		{/if}
		{#if !expectedSigner.trim()}
			<Alert variant="destructive">
				<AlertDescription>
					Enter the authorized multisig signer address, then verify or find its Ledger
					path before signing.
				</AlertDescription>
			</Alert>
		{/if}

		<div class="flex flex-wrap gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={deriveAddress}
				disabled={!ledgerSupported || deriving || scanning || signing}
			>
				{deriving ? 'Deriving...' : 'Connect & Verify Address'}
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={scanForExpectedSigner}
				disabled={!ledgerSupported || deriving || scanning || signing || !expectedSigner.trim()}
			>
				{scanning ? 'Scanning...' : 'Find Expected Signer Path'}
			</Button>
			<Button
				variant="default"
				size="sm"
				onclick={signWithLedger}
				disabled={!canSignWithLedger}
			>
				{signing ? 'Signing...' : 'Sign L1 Payload'}
			</Button>
		</div>

		{#if progress}
			<div class="text-muted-foreground rounded-md border border-border p-3 text-xs">
				<div>{progress.message}</div>
				{#if progress.detail}
					<div class="mt-1 font-mono text-[0.65rem]">{progress.detail}</div>
				{/if}
			</div>
		{/if}

		{#if error}
			<Alert variant="destructive">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		{/if}

		{#if result}
			<SignatureOutput {result} />
		{/if}
	</CardContent>
</Card>
