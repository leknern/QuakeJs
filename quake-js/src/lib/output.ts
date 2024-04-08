export class Output<T> {
	#subscription?: ($event?: T) => void

	constructor() { }

	dispatch($event: T) {
		this.#subscription?.($event)
	}

	subscribe(fn: ($event?: T) => void) {
		this.#subscription = fn
	}
}