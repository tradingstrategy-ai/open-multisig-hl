<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
</script>

<Alert class="border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:border-yellow-500/30 dark:bg-yellow-950/50 dark:text-yellow-200">
	<TriangleAlertIcon class="text-yellow-600 dark:text-yellow-400" />
	<AlertTitle>Payload Consistency Required</AlertTitle>
	<AlertDescription>
		All signers must sign the exact same payload. Coordinate nonce values before signing. Changing any field invalidates previously collected signatures.
	</AlertDescription>
</Alert>
