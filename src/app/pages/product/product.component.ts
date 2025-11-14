import { Component, inject } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { Location } from '@angular/common';

@Component({
  selector: 'app-product',
  imports: [SharedModule],
  templateUrl: './product.component.html',
})
export class ProductComponent {
  private readonly location = inject(Location);

  navigateBack(): void {
    this.location.back();
  }
}
