import "reflect-metadata"
import { QuakePrototype } from "./quake"

export interface InjectableInfo {
	scoped: boolean
}

export function asInjectable(meta: InjectableInfo, service: QuakePrototype<Object>) {
	Reflect.defineMetadata('meta', meta, service)
}