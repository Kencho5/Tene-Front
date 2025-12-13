import { Component, ChangeDetectionStrategy, computed } from '@angular/core';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-checkout',
  imports: [SharedModule, BreadcrumbComponent],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'მთავარი', route: '/' },
    { label: 'პროდუქცია', route: '/products' },
    { label: 'კაბელები', route: '/products' },
  ]);
}
