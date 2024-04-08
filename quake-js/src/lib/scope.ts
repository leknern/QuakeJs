interface ProxySubscription {
	callback: (() => void) | null
	set: (target: any, arg: string, value: any) => boolean
}

export class Scope<T> {
	scope: T
	#subscription: ProxySubscription = {
		callback: null,
		set(target: any, arg: string, value: any) {
			if (!(arg in target)) {
				throw new Error('Scope cannot be extended.')
			}

			if (target[arg] !== value) {
				target[arg] = value

				this.callback?.()
			}

			return true
		}
	}

	constructor(_value: T) {
		this.scope = new Proxy(_value, this.#subscription)
	}

	subscribe(fn: () => void) {
		this.#subscription.callback = fn
	}

	unsubscribe() {
		this.#subscription.callback = null
	}
}