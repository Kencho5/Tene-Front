import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { ProductsService } from '@core/services/products/products.service';
import { CableType, CableVariant } from '@core/interfaces/admin/cable-types.interface';
import { CartItem } from '@core/interfaces/products.interface';

@Component({
  selector: 'app-cable-configurator',
  imports: [SharedModule],
  templateUrl: './cable-configurator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CableConfiguratorComponent {
  private readonly productsService = inject(ProductsService);

  readonly cableTypeId = input.required<number>();
  readonly config = input<CartItem['cableConfig'] | null>(null);
  readonly showError = input<boolean>(false);

  readonly configChange = output<CartItem['cableConfig'] | null>();

  readonly cableTypeResource = rxResource({
    defaultValue: null as CableType | null,
    params: () => this.cableTypeId(),
    stream: ({ params: typeId }) =>
      this.productsService.getCableType(typeId).pipe(catchError(() => of(null as CableType | null))),
  });

  readonly cableVariants = computed<CableVariant[]>(() => {
    const type = this.cableTypeResource.value();
    if (!type) return [];
    return [...type.variants].sort((a, b) => a.watts - b.watts || a.length_cm - b.length_cm);
  });

  readonly cableWattsOptions = computed<number[]>(() =>
    [...new Set(this.cableVariants().map((v) => v.watts))].sort((a, b) => a - b),
  );

  readonly selectedWatts = signal<number | null>(null);
  readonly selectedLengthIdx = signal<number | null>(null);

  readonly cableLengths = computed<number[]>(() => {
    const watts = this.selectedWatts();
    if (watts === null) return [];
    return this.lengthsFor(watts);
  });

  readonly sliderLengths = computed<number[]>(() => [0, ...this.cableLengths()]);

  readonly sliderIdx = computed<number>(() => {
    const idx = this.selectedLengthIdx();
    return idx === null ? 0 : idx + 1;
  });

  readonly hasSelectedLength = computed<boolean>(() => this.selectedLengthIdx() !== null);

  readonly priceVariant = computed<CableVariant | null>(() => {
    const watts = this.selectedWatts();
    const lengths = this.cableLengths();
    if (watts === null || lengths.length === 0) return null;
    const length = lengths[Math.min(this.selectedLengthIdx() ?? 0, lengths.length - 1)];
    return this.cableVariants().find((v) => v.watts === watts && v.length_cm === length) ?? null;
  });

  constructor() {
    effect(() => {
      const watts = this.cableWattsOptions();
      if (watts.length === 0 || this.selectedWatts() !== null) return;
      const config = untracked(this.config);
      const chosenWatts = config && watts.includes(config.watts) ? config.watts : watts[0];
      this.selectedWatts.set(chosenWatts);
      const lenIdx = config ? this.lengthsFor(chosenWatts).indexOf(config.lengthCm) : -1;
      this.selectedLengthIdx.set(lenIdx !== -1 ? lenIdx : null);
    });
  }

  setWatts(w: number): void {
    if (this.selectedWatts() === w) return;
    const prevIdx = this.selectedLengthIdx();
    const prevLength = prevIdx === null ? null : this.cableLengths()[prevIdx];
    this.selectedWatts.set(w);
    const nextLengths = this.cableLengths();
    if (prevLength === null || nextLengths.length === 0) {
      this.selectedLengthIdx.set(null);
    } else {
      let closestIdx = 0;
      nextLengths.forEach((len, i) => {
        if (Math.abs(len - prevLength) < Math.abs(nextLengths[closestIdx] - prevLength)) {
          closestIdx = i;
        }
      });
      this.selectedLengthIdx.set(closestIdx);
    }
    this.emitConfig();
  }

  setLengthIdx(idx: number | null): void {
    this.selectedLengthIdx.set(idx);
    this.emitConfig();
  }

  onLengthSliderChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.setLengthIdx(value === 0 ? null : value - 1);
  }

  private lengthsFor(watts: number): number[] {
    return this.cableVariants()
      .filter((v) => v.watts === watts)
      .map((v) => v.length_cm)
      .sort((a, b) => a - b);
  }

  private emitConfig(): void {
    const v = this.hasSelectedLength() ? this.priceVariant() : null;
    const current = this.config();
    if (!v) {
      if (current) this.configChange.emit(null);
      return;
    }
    if (current?.variantId === v.id) return;
    this.configChange.emit({
      variantId: v.id,
      cableTypeId: v.cable_type_id,
      watts: v.watts,
      lengthCm: v.length_cm,
      price: Number(v.price),
      warranty: v.warranty_months === 1 ? '1 თვე' : `${v.warranty_months} თვე`,
    });
  }
}
