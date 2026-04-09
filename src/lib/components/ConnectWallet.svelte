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

<!-- Wallet picker modal -->
{#if wallet.showPicker}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={() => (wallet.showPicker = false)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="bg-background w-80 rounded-xl border p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-4 text-base font-semibold">Select a wallet</h2>
			<ul class="space-y-2">
				{#each wallet.discoveredWallets as w}
					<li>
						<button
							class="hover:bg-muted flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
							onclick={() => wallet.connectProvider(w)}
						>
							<img src={w.info.icon} alt={w.info.name} class="size-8 rounded-md" />
							<span class="text-sm font-medium">{w.info.name}</span>
						</button>
					</li>
				{/each}
			</ul>
			<Button variant="ghost" size="sm" class="mt-4 w-full" onclick={() => (wallet.showPicker = false)}>
				Cancel
			</Button>
		</div>
	</div>
{/if}
