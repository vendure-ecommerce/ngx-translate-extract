import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
	selector: 'app-private-translate-service',
	standalone: true,
	template: `
		<div>
			<h1>{{ welcomeMessage }}</h1>
			<p>{{ descriptionMessage }}</p>
		</div>
	`
})
export class PrivateTranslateServiceComponentFixture {
	private readonly #translate = inject(TranslateService);

	readonly welcomeMessage = this.#translate.instant('private-translate-service.comp.welcome');
	readonly descriptionMessage = this.#translate.instant('private-translate-service.comp.description');
}
