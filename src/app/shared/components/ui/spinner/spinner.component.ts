import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  imports: [],
  templateUrl: './spinner.component.html',
})
export class SpinnerComponent {
  readonly size = input.required<number>();
  readonly fillColor = input.required<string>();
  readonly textColor = input.required<string>();
}
