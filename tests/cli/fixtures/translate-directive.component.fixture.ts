import { Component } from '@angular/core';
import { TranslateDirective } from '@ngx-translate/core';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [TranslateDirective],
	template: `
		<div>
			<h1 [translate]="'directive.comp.welcome'"></h1>
			<p [translate]="'directive.comp.description'"></p>
		</div>
	`
})
export class TranslateDirectiveComponentFixture {}
