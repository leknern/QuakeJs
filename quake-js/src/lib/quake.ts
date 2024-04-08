import "reflect-metadata"
//@ts-ignore
import { parse } from 'himalaya'
import { Component, ComponentMetadata } from "./component"
import { InjectableInfo } from "./injectable";
import { Scope } from "./scope";
import { Output } from "./output";

//#region interfaces, classes
export type QuakePrototype<T> = new (...dependencies: any[]) => T

export class QuakeDependency {
	static #container: Map<string, Object> = new Map()

	static provide<T>(service: QuakePrototype<T>): T {
		const meta = checkServiceInfo(service)

		if (meta.scoped) {
			return provideInstance(service)
		}

		if (this.#container.has(service.name)) {
			return this.#container.get(service.name) as unknown as T
		}

		const instance = provideInstance(service)
		this.#container.set(service.name, instance as Object)

		return instance
	}
}

interface QuakeInit {
	components: QuakePrototype<Component>[]
	bootstrap: QuakePrototype<Component>
	root: HTMLElement
}

type QuakeNode = QuakeComponent | QuakeText | QuakeComment

export interface QuakeComponent {
	type: QuakeType.Component
	tagName: string
	attributes: { key: string, value: string }[] | Map<string, any>
	children: QuakeNode[]
	context: Object
	isFromEach?: boolean
	ref?: any
}

interface QuakeText {
	type: QuakeType.Text
	context: Object
	content: string
	isFromEach?: boolean
	ref?: any
}

interface QuakeComment {
	type: QuakeType.Comment
	content: string
}

export enum QuakeType {
	Component = 'element',
	Text = 'text',
	Comment = 'comment'
}
//#endregion

const startedQuakeInstances = []

//#region Quake app
export class QuakeApp {
	#components: Map<string, QuakePrototype<Component>> = new Map()
	#bootstrap: QuakePrototype<Component>

	constructor(init: QuakeInit) {
		this.#bootstrap = init.bootstrap
	}

	start() {
		startedQuakeInstances.push(this)
		this.#startMessage()
	}

	#startMessage() {
		if (startedQuakeInstances.length === 1) {
			console.log("%cShaking things up with Quake! 🚀", "color: #FAE6FA;");
		}
	}

}
//#endregion

export class Quake {
	static changeDetection(componentRef: any, template: string) {

	}

	static makeComponent(tag: string, str: string, context: Object): QuakeComponent {
		return {
			type: QuakeType.Component,
			tagName: tag,
			attributes: [],
			children: Quake.preprocess(str),
			context,
			isFromEach: false,
			ref: document.createDocumentFragment()
		}
	}

	static searchScopeInstance(componentInstance: Component) {
		const scopeInstances: Scope<any>[] = []

		for (const name of Object.keys(componentInstance)) {
			//@ts-ignore
			const propInstance = componentInstance[name]
			if (propInstance instanceof Scope) {
				scopeInstances.push(propInstance)
			}
		}

		if (scopeInstances.length > 1) {
			throw new Error(`One scope can be declared. (${componentInstance.constructor.name})`)
		}

		return scopeInstances
	}

	static preprocess(str: string) {
		str = str.replace(/<!---->/g, '')
		return parse(str)
	}

	static createQuakeDomTree(quakeComponent: QuakeComponent) {
		const quakeComponents: QuakeComponent[] = [quakeComponent]

		while (quakeComponents.length !== 0) {
			const quakeComponent = quakeComponents.shift()!
			const newSubQuakeNodes: QuakeNode[] = []

			for (let subQuakeNode of quakeComponent.children) {
				switch (subQuakeNode.type) {
					case QuakeType.Comment:
						newSubQuakeNodes.push(subQuakeNode)
						break
					case QuakeType.Text:
						subQuakeNode.context = quakeComponent.context

						if (quakeComponent.isFromEach) {
							subQuakeNode = copyTextFromEach(subQuakeNode)
						}

						subQuakeNode.content = exeScriptsInContent(subQuakeNode.content, subQuakeNode.context)
						newSubQuakeNodes.push(subQuakeNode)
						break
					default:
						subQuakeNode.context = quakeComponent.context

						if (quakeComponent.isFromEach) {
							subQuakeNode = copyComponentFromEach(subQuakeNode)
						}

						if (Array.isArray(subQuakeNode.attributes)) {
							subQuakeNode.attributes = toMap(subQuakeNode.attributes)
						}

						if (subQuakeNode.tagName === 'quake-if') {
							if (!subQuakeNode.attributes.has('*condition')) {
								throw new Error('No condition defined.')
							}

							const quakeIf = subQuakeNode.attributes.get('*condition')

							if (execute(quakeIf, subQuakeNode.context)) {
								subQuakeNode.attributes.clear()

								newSubQuakeNodes.push(subQuakeNode)
								quakeComponents.push(subQuakeNode)
							} else {
								newSubQuakeNodes.push({ type: QuakeType.Comment, content: '' } as QuakeComment)
							}
						} else if (subQuakeNode.tagName === 'quake-each') {
							if (!subQuakeNode.attributes.has('*items')) {
								throw new Error('No items defined.')
							}
							
							if (!subQuakeNode.attributes.has('*key')) {
								throw new Error('No key defined.')
							}

							const quakeEach = execute(subQuakeNode.attributes.get('*items'), subQuakeNode.context)

							if (!checkIsEach(quakeEach)) {
								throw new Error('Not iterable.')
							}

							if (quakeEach.length === 0) {
								newSubQuakeNodes.push({ type: QuakeType.Comment, content: '' } as QuakeComment)
							} else {
								for(let index = 0; index < quakeEach.length; index++) {
									const copiedQuakeNode = copyComponentFromEach(subQuakeNode)

									//@ts-ignore
									const quakeAs = copiedQuakeNode.attributes.get('*as')
									if (quakeAs) {
										//@ts-ignore
										copiedQuakeNode.context[quakeAs] = quakeEach[index]
									}

									//@ts-ignore
									const quakeIndex = copiedQuakeNode.attributes.get('*index')
									if (quakeIndex) {
										//@ts-ignore
										copiedQuakeNode.context[quakeIndex] = index
									}

									//@ts-ignore
									const quakeKey = copiedQuakeNode.attributes.get('*key')
									const key = execute(quakeKey, copiedQuakeNode.context)
									//@ts-ignore
									copiedQuakeNode.attributes.clear()
									//@ts-ignore
									copiedQuakeNode.attributes.set('quake-key', key)

									newSubQuakeNodes.push(copiedQuakeNode)
									quakeComponents.push(copiedQuakeNode)
								}
							}
						} else {
							subQuakeNode.attributes.forEach((value, name) => {
								if (subQuakeNode.type === QuakeType.Component) {
									//@ts-ignore
									subQuakeNode.attributes.set(name, execute(value, subQuakeNode.context))
								}
							})
	
							newSubQuakeNodes.push(subQuakeNode)
							quakeComponents.push(subQuakeNode)
						}
				}
			}

			quakeComponent.children = newSubQuakeNodes
		}
		
		return quakeComponent
	}

	static initIntoDocumentFragment(quakeComponent: QuakeComponent) {
		const componentsQueue: QuakeComponent[] = new Array(quakeComponent)

		while (componentsQueue.length !== 0) {
			let quakeComponent = componentsQueue.shift()!

			for (const subQuakeComponent of quakeComponent.children) {
				let createdRef: NodeRef

				switch (subQuakeComponent.type) {
					case QuakeType.Component:
						if (subQuakeComponent.tagName === 'quake-if' || subQuakeComponent.tagName === 'quake-each') {
							createdRef = document.createDocumentFragment()

							subQuakeComponent.ref = createdRef
							createdRef = this.initIntoDocumentFragment(subQuakeComponent)
							
							quakeComponent.ref.appendChild(createdRef)

						} else {
							createdRef = document.createElement(subQuakeComponent.tagName)

							subQuakeComponent.ref = createdRef
							subQuakeComponent.attributes.forEach((value, name) => {
								//@ts-ignore
								createdRef.setAttribute(name, value)
							})

							componentsQueue.push(subQuakeComponent)
							quakeComponent.ref.appendChild(createdRef)
						}
						break
					case QuakeType.Text:
						createdRef = document.createTextNode(subQuakeComponent.content)
						subQuakeComponent.ref = createdRef
						quakeComponent.ref.appendChild(createdRef)
						break
					default:
						createdRef = document.createComment(subQuakeComponent.content)
						quakeComponent.ref.appendChild(createdRef)
				}
			}
		}

		return quakeComponent.ref
	}

	static updateComponentDom(quakeComponent: QuakeComponent, newQuakeComponent: QuakeComponent) {

	}
}

type NodeRef = HTMLElement | DocumentFragment | Text | Comment


function copyComponentFromEach(quakeComponent: QuakeComponent) {
	return {
		...quakeComponent,
		attributes: Array.isArray(quakeComponent.attributes) 
			? [...quakeComponent.attributes] 
			: new Map(quakeComponent.attributes),
		context: { ...quakeComponent.context },
		children: [...quakeComponent.children],
		isFromEach: true
	}
}

function copyTextFromEach(quakeText: QuakeText) {
	return {
		...quakeText,
		context: { ...quakeText.context },
		isFromEach: true
	}
}

function provideInstance<T>(prototype: QuakePrototype<T>): T {
	return new prototype() as unknown as T
}

function exeScriptsInContent(content: string, scope: Object) {
	const scripts = content.match(/\{\{.*?\}\}/g)

	if (scripts) {
		for (const script of scripts) {
			content = content.replace(script, execute(script, scope))
		}
	}

	return content
}

function toMap(props: { key: string, value: string }[]) {
	return new Map<string, any>(props.map(prop => [prop.key, prop.value]))
}

function checkIsEach(obj: any) {
	return Array.isArray(obj) || typeof obj === 'string'
}










































































function searchOutputInstances(componentInstance: Component) {
	const outputInstances: Map<string, Output<any>> = new Map()

	for (const name of Object.keys(componentInstance)) {
		//@ts-ignore
		const propInstance = componentInstance[name]
		if (propInstance instanceof Output) {
			outputInstances.set(name, propInstance)
		}
	}

	return outputInstances
}


































interface QuakeQueueItem {
	node: QuakeComponent,
	newNode: QuakeComponent
}




export function execute(script: string | undefined, scope: Object) {
	const sc = /^{{.*}}$/

	if (script) {
		return sc.test(script)
			? new Function(...Object.keys(scope), 'return ' + script.replace('{{', '').replace('}}', ''))
				(...Object.values(scope))
			: script
	}

	return undefined
}




function queryPrototypeMetadata(component: QuakePrototype<Component>): ComponentMetadata {
	const meta = Reflect.getMetadata('meta', component)

	if (!meta || !('tag' in meta) || !('template' in meta)) {
		throw new Error(`(${component.name}) Object is not declared as a component.`)
	}

	return meta
}

function checkServiceInfo<T>(service: QuakePrototype<T>): InjectableInfo {
	const meta = Reflect.getMetadata('meta', service)

	if (!meta || !('scoped' in meta)) {
		throw new Error(`(${service.name}) Object is not declared as a service.`)
	}

	return meta
}