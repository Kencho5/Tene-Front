import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AddressService } from '@core/services/address.service';
import { AddressData } from '@core/interfaces/address.interface';
import { SharedModule } from '@shared/shared.module';
import { SpinnerComponent } from '@shared/components/ui/spinner/spinner.component';

@Component({
  selector: 'app-addresses',
  imports: [SharedModule, SpinnerComponent],
  templateUrl: './addresses.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1' },
})
export class AddressesComponent {
  private readonly addressService = inject(AddressService);

  readonly addresses = rxResource({
    defaultValue: [] as AddressData[],
    stream: () => this.addressService.getAddresses(),
  });
}
