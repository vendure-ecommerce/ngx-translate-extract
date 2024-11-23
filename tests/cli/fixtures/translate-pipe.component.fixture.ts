import { Component } from '@angular/core';
import { TranslatePipe } from "@ngx-translate/core";

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [TranslatePipe],
	template: `
		<div>
			<h1>{{ 'pipe.comp.welcome' | translate }}</h1>
			<p>{{ 'pipe.comp.description' | translate }}</p>
		</div>
	`
})
export class TranslatePipeComponentFixture {}
