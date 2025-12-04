import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-image',
  imports: [],
  templateUrl: './image.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageComponent {
  readonly src = input.required<string>();
  readonly width = input<number>(200);
  readonly height = input<number>(200);
  readonly loading = input<'lazy' | 'eager'>('lazy');
  readonly class = input<string>('');
  readonly alt = input<string>('');

  readonly imageLoad = output<void>();

  protected readonly imageLoaded = signal(false);

  protected onImageLoad(): void {
    this.imageLoaded.set(true);
    this.imageLoad.emit();
  }
}
