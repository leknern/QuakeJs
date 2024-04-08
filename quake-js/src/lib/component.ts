import "reflect-metadata"
import { Quake, QuakeComponent, QuakePrototype } from "./quake"
import { Scope } from "./scope"

export interface ComponentMetadata {
	tag: string
	str: string
	inputs: []
}

export class Component {
	onInit(): void { }
	onViewInit(): void { }
	onInputChange(): void { }
	onDestroy(): void { }
}

export function asComponent(metadata: ComponentMetadata, component: QuakePrototype<Component>) {
	customElements.define(metadata.tag, class extends HTMLElement {
		componentInstance!: Component
		componentScopes!: Scope<any>[]
		currentQuakeDom!: QuakeComponent
		
		connectedCallback() {
			this.componentInstance = new component()
			this.componentScopes = Quake.searchScopeInstance(this.componentInstance)

			this.componentScopes.forEach((componentScope) => {
				componentScope.subscribe(() => {
					const quakeDom = Quake.makeComponent(metadata.tag, metadata.str, componentScope.scope)
					Quake.createQuakeDomTree(quakeDom)
					
					const quakeDomRef = Quake.initIntoDocumentFragment(quakeDom)
					this.replaceChildren(quakeDomRef)
				})
			})
			
			this.componentInstance.onInit()		

			this.subscribeToButtons()
		}




		private subscribeToButtons() {
			document.getElementById('change')!.onclick = () => {
				this.componentScopes[0].scope.count += '*'
			}

			document.getElementById('destroy')!.onclick = () => {
				document.getElementById('sandbox')!.innerHTML = ''
			}
		}

		disconnectedCallback() {
			this.componentScopes.forEach((componentScope) => {
				componentScope.unsubscribe()
			})
			this.componentInstance.onDestroy()
		}
	})
}