<script lang="ts">
	import { asset } from '$app/paths';
	import ConnectWallet from '$lib/components/ConnectWallet.svelte';
	import PayloadForm from '$lib/components/PayloadForm.svelte';
	import EIP712Preview from '$lib/components/EIP712Preview.svelte';
	import SignButton from '$lib/components/SignButton.svelte';
	import SignatureOutput from '$lib/components/SignatureOutput.svelte';
	import CoordinatorHelper from '$lib/components/CoordinatorHelper.svelte';
	import SessionShare from '$lib/components/SessionShare.svelte';
	import WrongChainAlert from '$lib/components/WrongChainAlert.svelte';
	import BalanceBox from '$lib/components/BalanceBox.svelte';
	import NetworkSwitch from '$lib/components/NetworkSwitch.svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card/index.js';
	import type { Network } from '$lib/types.js';
	import { getWallet } from '$lib/wallet.svelte.js';
	import { getActionDef } from '$lib/eip712.js';
	import { HYPERCORE_SIGNING_CHAIN_ID } from '$lib/chains.js';
	import { signMultisig } from '$lib/signing.js';
	import { validateForm, isFormValid } from '$lib/validation.js';
	import {
		formValuesFromSearchParams,
		formValuesToQueryString,
	} from '$lib/form-url-state.js';
	import type { FormValues, SignatureResult } from '$lib/types.js';

	const wallet = getWallet();

	// Initial state is hydrated from the URL so reloading preserves inputs.
	// SSR is disabled for this app (see +layout.ts), so `window` is always available.
	let values = $state<FormValues>(
		formValuesFromSearchParams(new URLSearchParams(window.location.search)),
	);
	let errors = $state<Record<string, string | null>>({ multisigAddress: null });
	let result = $state<SignatureResult | null>(null);
	let signError = $state<string | null>(null);
	let signing = $state(false);

	// Keep the URL in sync with form state. `replaceState` avoids polluting
	// browser history with every keystroke.
	$effect(() => {
		const qs = formValuesToQueryString(values);
		const target = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
		const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		if (target !== current) {
			window.history.replaceState(window.history.state, '', target);
		}
	});

	let actionDef = $derived(getActionDef(values.actionType));
	let formErrors = $derived(validateForm(values, actionDef));
	// Hyperliquid was built on the Arbitrum stack, so its EIP-712 signing
	// domain hard-codes Arbitrum Sepolia (chainId 421614). Signatures are
	// produced off-chain and submitted to the Hyperliquid API, so MetaMask
	// signs from any chain, but wallets like Rabby enforce that the connected
	// chain matches the domain chainId. We surface this as "Hypercore signing
	// chain" but do not block signing on mismatch.
	let requiredChainId = HYPERCORE_SIGNING_CHAIN_ID;
	let canSign = $derived(wallet.connected && isFormValid(formErrors));

	async function handleSign() {
		const provider = wallet.provider;
		const addr = wallet.address;
		if (!wallet.client || !addr || !provider) return;
		signing = true;
		signError = null;
		result = null;
		try {
			result = await signMultisig(provider, addr, values, addr);
		} catch (err) {
			console.error('Signing failed:', err);
			if (err instanceof Error) {
				signError = err.stack ? `${err.message}\n\n${err.stack}` : err.message;
			} else {
				try {
					signError = `Signing failed: ${JSON.stringify(err, null, 2)}`;
				} catch {
					signError = `Signing failed: ${String(err)}`;
				}
			}
		} finally {
			signing = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<img src={asset('/trading-strategy-logo.svg')} alt="Trading Strategy" class="h-8" />
			<div>
				<h1 class="text-2xl font-bold">Open Hyperliquid Multisigner</h1>
				<p class="text-muted-foreground mt-1 text-sm">
					Sign Hyperliquid multisig transactions with Rabby or MetaMask
				</p>
			</div>
		</div>
		<NetworkSwitch
			network={values.network}
			onchange={(n: Network) => (values = { ...values, network: n })}
		/>
	</div>

	<WrongChainAlert {requiredChainId} />

	<div class="grid gap-6 lg:grid-cols-2">
		<div class="min-w-0 space-y-4">
			<Card>
				<CardHeader>
					<CardTitle class="text-sm">1. Connect Wallet</CardTitle>
				</CardHeader>
				<CardContent>
					<ConnectWallet />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle class="text-sm">2. Payload</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<PayloadForm bind:values bind:errors />
					<SignButton disabled={!canSign} {signing} onclick={handleSign} />
					{#if signError}
						<div class="space-y-2 rounded-md border border-destructive bg-destructive/10 px-4 py-3">
							<div class="text-sm font-medium text-destructive">Signing failed</div>
							<textarea
								readonly
								rows="6"
								class="w-full resize-y rounded border border-destructive/40 bg-background/60 p-2 font-mono text-xs text-destructive"
								value={signError}
							></textarea>
						</div>
					{/if}
					{#if result}
						<SignatureOutput {result} />
					{/if}
				</CardContent>
			</Card>
			<BalanceBox
				multisigAddress={values.multisigAddress}
				signerAddress={wallet.address ?? ''}
				network={values.network}
			/>
		</div>
		<Card>
			<CardHeader>
				<CardTitle class="text-sm">EIP-712 Preview</CardTitle>
			</CardHeader>
			<CardContent>
				<EIP712Preview {values} />
			</CardContent>
		</Card>
	</div>

	<SessionShare {values} disabled={!canSign} />
	<CoordinatorHelper />
</div>
