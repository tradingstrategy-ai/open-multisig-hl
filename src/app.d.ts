// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Window {
		ethereum?: import('viem').EIP1193Provider & {
			on(event: string, handler: (...args: any[]) => void): void
			removeListener(event: string, handler: (...args: any[]) => void): void
		}
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
