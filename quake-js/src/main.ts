import { AppComponent } from './app/app.component'
import { HomeComponent } from './home/home.component'
import { QuakeApp } from './lib/quake'
import './main.css'

new QuakeApp({
	components: [
		AppComponent,
		HomeComponent
	],
	bootstrap: AppComponent,
	root: document.getElementById('app')!
}).start()
