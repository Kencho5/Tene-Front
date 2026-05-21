import { Injectable, Signal, computed } from '@angular/core';
import {
  CHECKOUT_STRINGS,
  DELIVERY_PRICES,
  DeliveryTime,
  HIGH_MOUNTAIN_CITIES,
  SAME_DAY_CUTOFF,
  formatGel,
} from './checkout.config';

export interface DeliveryPricingInputs {
  city: Signal<string>;
  deliveryTime: Signal<string>;
  deliveryType: Signal<string>;
  qualifiesForFreeShipping: Signal<boolean>;
}

export interface DeliveryOption {
  value: DeliveryTime;
  label: string;
  disabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class DeliveryPricingService {
  private isWithinSameDayCutoff(now: Date = new Date()): boolean {
    if (now.getDay() === 0) return false;
    const { hour, minute } = SAME_DAY_CUTOFF;
    return now.getHours() < hour || (now.getHours() === hour && now.getMinutes() < minute);
  }

  readonly timeAllowsSameDay = this.isWithinSameDayCutoff();

  create(inputs: DeliveryPricingInputs) {
    const isTbilisi = (city: string) => !city || city === 'tbilisi';

    const sameDayAvailable = computed(
      () => this.timeAllowsSameDay && isTbilisi(inputs.city()),
    );

    const sameDayUnavailableReason = computed(() => {
      const city = inputs.city();
      if (city && city !== 'tbilisi') return CHECKOUT_STRINGS.sameDayOutsideTbilisi;
      if (!this.timeAllowsSameDay) return CHECKOUT_STRINGS.sameDayPastCutoff;
      return '';
    });

    const priceForTime = (time: DeliveryTime, city: string): number => {
      if (inputs.qualifiesForFreeShipping()) return 0;
      if (HIGH_MOUNTAIN_CITIES.has(city)) return DELIVERY_PRICES.highMountain;
      if (city && city !== 'tbilisi') return DELIVERY_PRICES.outsideTbilisi;
      return time === 'same_day' ? DELIVERY_PRICES.sameDay : DELIVERY_PRICES.nextDay;
    };

    const sameDayPrice = computed(() => priceForTime('same_day', inputs.city()));
    const nextDayPrice = computed(() => priceForTime('next_day', inputs.city()));

    const deliveryPrice = computed(() => {
      if (inputs.deliveryType() === 'pickup') return 0;
      const time = inputs.deliveryTime() as DeliveryTime | '';
      return priceForTime(time === 'same_day' ? 'same_day' : 'next_day', inputs.city());
    });

    const deliveryNotice = computed(() => {
      const city = inputs.city();
      if (!city || city === 'tbilisi') return '';
      if (HIGH_MOUNTAIN_CITIES.has(city)) return CHECKOUT_STRINGS.highMountainNotice;
      return CHECKOUT_STRINGS.outsideTbilisiNotice;
    });

    const deliveryTimeOptions = computed<DeliveryOption[]>(() => {
      const available = sameDayAvailable();
      const sameDayBase = `${CHECKOUT_STRINGS.sameDayLabelPrefix} - ${formatGel(sameDayPrice())}`;
      const sameDayLabel = available
        ? sameDayBase
        : `${sameDayBase} ${CHECKOUT_STRINGS.sameDayUnavailableSuffix}`;
      return [
        { value: 'same_day', label: sameDayLabel, disabled: !available },
        {
          value: 'next_day',
          label: `${CHECKOUT_STRINGS.nextDayLabelPrefix} - ${formatGel(nextDayPrice())}`,
        },
      ];
    });

    return {
      sameDayAvailable,
      sameDayUnavailableReason,
      sameDayPrice,
      nextDayPrice,
      deliveryPrice,
      deliveryNotice,
      deliveryTimeOptions,
    };
  }
}
