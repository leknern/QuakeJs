import { Component, asComponent } from "../lib/component";
import { Scope } from "../lib/scope";
import './home.component.css'
import str from './home.component.html?raw'

export class HomeComponent extends Component {
	scope = new Scope({
		count: ''
	})

	constructor() {
		super()
	}

	onInit(): void {
		console.log('Home component inited.')
	}

	onDestroy(): void {
		console.log('Home component destroyed.')
	}
}
asComponent({
	tag: 'quake-home',
	str,
	inputs: []
}, HomeComponent)