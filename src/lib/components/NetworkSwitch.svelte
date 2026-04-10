<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Network } from '$lib/types.js';

	interface Props {
		network: Network;
		onchange: (network: Network) => void;
		disabled?: boolean;
	}

	let { network, onchange, disabled = false }: Props = $props();
</script>

<div class="inline-flex items-center gap-2">
	<img src="/hyperliquid.svg" alt="Hyperliquid" class="h-5 w-5" />
	<div class="flex gap-1">
		<Button
			variant={network === 'Mainnet' ? 'default' : 'outline'}
			size="sm"
			{disabled}
			onclick={() => onchange('Mainnet')}
		>
			Mainnet
		</Button>
		<Button
			variant={network === 'Testnet' ? 'default' : 'outline'}
			size="sm"
			{disabled}
			onclick={() => onchange('Testnet')}
		>
			Testnet
		</Button>
	</div>
</div>
