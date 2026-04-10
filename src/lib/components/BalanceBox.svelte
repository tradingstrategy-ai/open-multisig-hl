<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { fetchBalances, type HyperliquidBalances } from '$lib/balances.js';
	import type { Network } from '$lib/types.js';

	interface Props {
		multisigAddress: string;
		signerAddress: string;
		network: Network;
	}

	let { multisigAddress, signerAddress, network }: Props = $props();

	let multisigBalances = $state<HyperliquidBalances | null>(null);
	let signerBalances = $state<HyperliquidBalances | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
	let validMultisig = $derived(ADDRESS_RE.test(multisigAddress));
	let validSigner = $derived(ADDRESS_RE.test(signerAddress));

	async function refresh() {
		if (!validMultisig && !validSigner) {
			multisigBalances = null;
			signerBalances = null;
			error = null;
			return;
		}
		loading = true;
		error = null;
		try {
			const [ms, sg] = await Promise.all([
				validMultisig ? fetchBalances(multisigAddress, network) : Promise.resolve(null),
				validSigner ? fetchBalances(signerAddress, network) : Promise.resolve(null),
			]);
			multisigBalances = ms;
			signerBalances = sg;
		} catch (err) {
			console.error('Failed to fetch Hyperliquid balances:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch balances';
			multisigBalances = null;
			signerBalances = null;
		} finally {
			loading = false;
		}
	}

	// Auto-refresh whenever any input changes.
	$effect(() => {
		void multisigAddress;
		void signerAddress;
		void network;
		refresh();
	});

	function formatNumber(raw: string | undefined): string {
		if (raw === undefined) return '—';
		const n = Number(raw);
		if (!Number.isFinite(n)) return raw;
		return n.toLocaleString(undefined, {
			maximumFractionDigits: 4,
			minimumFractionDigits: 0,
		});
	}

	// One row per asset with a Multisig and Signer column, so each label
	// appears once instead of being repeated for both wallets.
	let rows = $derived([
		{
			label: 'USDC perp',
			multisig: multisigBalances?.usdcPerp,
			signer: signerBalances?.usdcPerp,
		},
		{
			label: 'HYPE perp',
			multisig: multisigBalances?.hypePerp,
			signer: signerBalances?.hypePerp,
		},
		{
			label: 'USDC spot',
			multisig: multisigBalances?.usdcSpot,
			signer: signerBalances?.usdcSpot,
		},
		{
			label: 'HYPE spot',
			multisig: multisigBalances?.hypeSpot,
			signer: signerBalances?.hypeSpot,
		},
	]);
</script>

<Card>
	<CardHeader class="flex flex-row items-center justify-between space-y-0">
		<CardTitle class="text-sm">Wallet balances</CardTitle>
		<Button
			size="sm"
			variant="outline"
			disabled={loading || (!validMultisig && !validSigner)}
			onclick={refresh}
		>
			{loading ? 'Loading...' : 'Refresh'}
		</Button>
	</CardHeader>
	<CardContent>
		{#if !validMultisig && !validSigner}
			<p class="text-muted-foreground text-xs">
				Connect your wallet and enter a multisig address to load balances.
			</p>
		{:else if error}
			<p class="text-destructive text-xs">{error}</p>
		{:else}
			<div class="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-xs">
				<div></div>
				<div class="text-muted-foreground text-right">Multisig</div>
				<div class="text-muted-foreground text-right">Signer</div>
				{#each rows as row (row.label)}
					<div class="text-muted-foreground">{row.label}</div>
					<div class="text-right font-mono">{formatNumber(row.multisig)}</div>
					<div class="text-right font-mono">{formatNumber(row.signer)}</div>
				{/each}
			</div>
		{/if}
	</CardContent>
</Card>
