import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
	selector: 'app-home',
	standalone: true,
	template: `
		<div>
			<h1>{{ welcomeMessage }}</h1>
			<p>{{ descriptionMessage }}</p>
		</div>
	`
})
export class HomeComponent {
	private readonly translate = inject(TranslateService);

	readonly welcomeMessage = this.translate.instant('home.welcome');
	readonly descriptionMessage = this.translate.instant('home.description');
}
