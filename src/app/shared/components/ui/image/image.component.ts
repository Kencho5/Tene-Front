import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-image',
  imports: [],
  templateUrl: './image.component.html',
})
export class ImageComponent {
  @Input() src!: string;
  @Input() width?: number = 200;
  @Input() height?: number = 200;
  @Input() loading?: string;
  @Input() customClass: string = '';
  @Input() alt?: string;

  imageLoaded = false;

  onImageLoad() {
    this.imageLoaded = true;
  }
}
