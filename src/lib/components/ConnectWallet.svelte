<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { getWallet } from '$lib/wallet.svelte.js';

	const wallet = getWallet();

	function truncateAddress(addr: string): string {
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
	}
</script>

<div class="flex items-center gap-3">
	{#if wallet.connected && wallet.address}
		<div class="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
			<span class="inline-block size-2 rounded-full bg-green-500"></span>
			<span class="font-mono text-xs">{truncateAddress(wallet.address)}</span>
		</div>
		<Button variant="outline" size="sm" onclick={() => wallet.disconnect()}>
			Disconnect
		</Button>
	{:else}
		<Button onclick={() => wallet.connect()} disabled={wallet.connecting}>
			{wallet.connecting ? 'Connecting...' : 'Connect Wallet'}
		</Button>
	{/if}
	{#if wallet.error}
		<span class="text-destructive text-xs">{wallet.error}</span>
	{/if}
</div>
