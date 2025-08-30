import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  imports: [],
  templateUrl: './spinner.html',
})
export class Spinner {
  @Input() size!: number;
  @Input() fillColor!: string;
  @Input() textColor!: string;
}
