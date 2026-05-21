import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { ProductCardComponent } from '@shared/components/ui/product-card/product-card.component';
import { ProductCardSkeletonComponent } from '@shared/components/ui/product-card-skeleton/product-card-skeleton.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { ProductsService } from '@core/services/products/products.service';
import { SeoService } from '@core/services/seo/seo.service';
import { SchemaService } from '@core/services/seo/schema.service';
import { ProductSearchResponse } from '@core/interfaces/products.interface';

interface CityData {
  slug: string;
  name: string;
  description: string;
  hasPhysicalStore: boolean;
  address?: string;
  phone?: string;
  workingHours?: string;
  deliveryInfo: string;
}

const CITY_DATA: Record<string, CityData> = {
  tbilisi: {
    slug: 'tbilisi',
    name: 'თბილისი',
    description:
      'ტექნიკის მაღაზია თბილისში — USB კაბელები, დამტენები, მობილურები, ყურსასმენები და აქსესუარები. ოფიციალური გარანტია, უფასო მიწოდება 100₾+ შეკვეთაზე, 1-2 სამუშაო დღეში.',
    hasPhysicalStore: true,
    address: 'თბილისი',
    deliveryInfo: 'მიწოდება თბილისის მასშტაბით 1-2 სამუშაო დღეში',
  },
  batumi: {
    slug: 'batumi',
    name: 'ბათუმი',
    description:
      'ტექნიკის ონლაინ მაღაზია ბათუმში — USB კაბელები, დამტენები, მობილურები და აქსესუარები. შეუკვეთეთ ონლაინ, მიიღეთ ბათუმში 2-4 სამუშაო დღეში.',
    hasPhysicalStore: false,
    deliveryInfo: 'მიწოდება ბათუმში 2-4 სამუშაო დღეში',
  },
  kutaisi: {
    slug: 'kutaisi',
    name: 'ქუთაისი',
    description:
      'ტექნიკის ონლაინ მაღაზია ქუთაისში — USB კაბელები, დამტენები, მობილურები და აქსესუარები. ოფიციალური გარანტია, მიწოდება ქუთაისში 2-4 დღეში.',
    hasPhysicalStore: false,
    deliveryInfo: 'მიწოდება ქუთაისში 2-4 სამუშაო დღეში',
  },
  rustavi: {
    slug: 'rustavi',
    name: 'რუსთავი',
    description:
      'ტექნიკის ონლაინ მაღაზია რუსთავში — USB კაბელები, დამტენები, მობილურები და აქსესუარები. სწრაფი მიწოდება რუსთავში 1-2 დღეში, ოფიციალური გარანტია.',
    hasPhysicalStore: false,
    deliveryInfo: 'მიწოდება რუსთავში 1-2 სამუშაო დღეში',
  },
  poti: {
    slug: 'poti',
    name: 'ფოთი',
    description:
      'ტექნიკის ონლაინ მაღაზია ფოთში — USB კაბელები, დამტენები, მობილურები და აქსესუარები. შეუკვეთეთ ონლაინ, მიიღეთ ფოთში 3-5 დღეში.',
    hasPhysicalStore: false,
    deliveryInfo: 'მიწოდება ფოთში 3-5 სამუშაო დღეში',
  },
};

@Component({
  selector: 'app-store',
  imports: [SharedModule, ProductCardComponent, ProductCardSkeletonComponent, BreadcrumbComponent],
  templateUrl: './store.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreComponent {
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);
  private readonly seoService = inject(SeoService);
  private readonly schemaService = inject(SchemaService);

  readonly city = input.required<string>();

  readonly cityData = computed(() => CITY_DATA[this.city()] ?? null);

  readonly otherCities = computed(() => {
    const current = this.city();
    return Object.values(CITY_DATA).filter((c) => c.slug !== current);
  });

  readonly searchResponse = rxResource({
    defaultValue: { products: [], total: 0, limit: 0, offset: 0 } as ProductSearchResponse,
    params: () => this.cityData(),
    stream: ({ params: data }) => {
      if (!data) return of({ products: [], total: 0, limit: 0, offset: 0 } as ProductSearchResponse);
      return this.productsService.searchProduct('in_stock=true&limit=12');
    },
  });

  readonly products = computed(() => this.searchResponse.value().products);
  readonly totalProducts = computed(() => this.searchResponse.value().total);

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: 'მთავარი', route: '/' }];
    const data = this.cityData();
    if (data) {
      items.push({ label: `მაღაზია - ${data.name}` });
    }
    return items;
  });

  constructor() {
    effect(() => {
      const data = this.cityData();
      if (!data) {
        this.router.navigate(['/404'], { replaceUrl: true });
        return;
      }

      const url = `https://tene.ge/store/${data.slug}`;
      const title = `ტექნიკის მაღაზია ${data.name}ში — USB კაბელები, დამტენები | Tene`;

      this.seoService.setMetaTags({
        title,
        description: data.description,
        url,
        type: 'website',
        keywords: `ტექნიკის მაღაზია ${data.name}, USB კაბელი ${data.name}, დამტენი ${data.name}, ონლაინ მაღაზია ${data.name}, მობილური აქსესუარები ${data.name}, Tene ${data.name}`,
      });

      this.schemaService.clearSchemas();

      this.schemaService.addBreadcrumbSchema(
        this.breadcrumbs().map((b) => ({
          name: b.label,
          url: b.route ? `https://tene.ge${b.route}` : url,
        })),
      );

      if (data.hasPhysicalStore) {
        this.schemaService.addLocalBusinessSchema({
          name: `Tene — ${data.name}`,
          url,
          description: data.description,
          image: 'https://tene.ge/logo.svg',
          telephone: data.phone,
          addressLocality: data.name,
          streetAddress: data.address,
          openingHours: ['Mo-Sa 10:00-20:00'],
          priceRange: '₾₾',
        });
      } else {
        this.schemaService.injectRaw({
          '@context': 'https://schema.org/',
          '@type': 'WebPage',
          name: title,
          description: data.description,
          url,
          inLanguage: 'ka-GE',
          about: {
            '@type': 'Organization',
            name: 'Tene',
            areaServed: { '@type': 'City', name: data.name },
          },
        });
      }
    });
  }
}
