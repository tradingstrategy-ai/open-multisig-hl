<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';

	interface Props {
		disabled: boolean;
		signing: boolean;
		onclick: () => void;
	}

	let { disabled, signing, onclick }: Props = $props();
</script>

<Button class="w-full" {disabled} {onclick}>
	{#if signing}
		Waiting for wallet...
	{:else}
		Sign Payload
	{/if}
</Button>
