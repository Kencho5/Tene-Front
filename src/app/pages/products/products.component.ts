import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-products',
  imports: [SharedModule],
  templateUrl: './products.component.html',
})
export class ProductsComponent {}
