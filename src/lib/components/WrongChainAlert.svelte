<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { getWallet } from '$lib/wallet.svelte.js';

	interface Props {
		requiredChainId: number;
	}

	let { requiredChainId }: Props = $props();

	const wallet = getWallet();

	let mismatch = $derived(
		wallet.connected && wallet.chainId !== null && wallet.chainId !== requiredChainId,
	);

	async function handleSwitch() {
		try {
			await wallet.switchChain(requiredChainId);
		} catch (err) {
			console.error('Chain switch failed:', err);
		}
	}
</script>

<!--
	Hyperliquid was built on the Arbitrum stack, so its EIP-712 signing domain
	uses Arbitrum Sepolia (chainId 421614) as a protocol constant. MetaMask
	ignores this and will sign from any chain, but wallets like Rabby require
	the connected chain to match the domain chainId. We surface this as
	"Hypercore signing chain (Arbitrum Sepolia)" to reduce confusion.
-->
{#if mismatch}
	<Alert variant="destructive">
		<AlertTitle>Wallet on the wrong network for signing</AlertTitle>
		<AlertDescription>
			You're connected to chain {wallet.chainId}. Hyperliquid's EIP-712 signing
			domain uses Arbitrum Sepolia (chainId 421614) because Hyperliquid was built
			on the Arbitrum stack. MetaMask signs from any chain, but wallets like Rabby
			require the connected chain to match — switch below if signing fails.
		</AlertDescription>
		<div class="mt-3">
			<Button
				size="sm"
				variant="outline"
				disabled={wallet.switchingChain}
				onclick={handleSwitch}
			>
				{wallet.switchingChain
					? 'Switching...'
					: 'Switch to Hypercore signing chain (Arbitrum Sepolia)'}
			</Button>
		</div>
	</Alert>
{/if}
