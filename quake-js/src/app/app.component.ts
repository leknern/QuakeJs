import { Component, asComponent } from "../lib/component"
import { Scope } from "../lib/scope"
import template from './app.component.html?raw'
import './app.component.css'

export class AppComponent extends Component {
	someScope = new Scope({
		count: ''
	})

	onInit(): void {
		console.log('App component inited.')
	}

	onDestroy(): void {
		console.log('App component destroyed.')
	}
}
asComponent({
	tag: 'quake-app',
	str: template,
	inputs: []
}, AppComponent)