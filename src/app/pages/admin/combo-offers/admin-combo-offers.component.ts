import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComboOffersManagerComponent } from '@shared/components/admin/combo-offers-manager/combo-offers-manager.component';

@Component({
  selector: 'app-admin-combo-offers',
  imports: [ComboOffersManagerComponent],
  template: `
    <div class="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 class="text-platinum-100 text-xl font-semibold tracking-tight sm:text-2xl">
        კომბო შეთავაზებები
      </h1>
      <app-combo-offers-manager />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComboOffersComponent {}
