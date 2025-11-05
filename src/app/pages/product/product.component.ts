import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-product',
  imports: [SharedModule],
  templateUrl: './product.component.html',
})
export class ProductComponent {}
