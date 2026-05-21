import { Injectable, inject, Renderer2, RendererFactory2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const SITE_ORIGIN = 'https://tene.ge';

@Injectable({ providedIn: 'root' })
export class SchemaService {
  private readonly document = inject(DOCUMENT);
  private readonly rendererFactory = inject(RendererFactory2);
  private renderer: Renderer2;
  private schemaElements: HTMLScriptElement[] = [];

  constructor() {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  addProductSchema(data: {
    name: string;
    description: string;
    image: string | string[];
    sku: string;
    mpn?: string;
    gtin?: string;
    brand_name?: string;
    price: number;
    currency: string;
    availability: 'InStock' | 'OutOfStock' | 'PreOrder';
    url: string;
    condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
    priceValidUntilDays?: number;
    aggregateRating?: { ratingValue: number; reviewCount: number };
    variants?: {
      sku: string;
      price: number;
      url: string;
      name?: string;
    }[];
  }): void {
    const condition = `https://schema.org/${data.condition ?? 'NewCondition'}`;
    const priceValidUntil = this.priceValidUntil(data.priceValidUntilDays ?? 30);
    const sharedOfferProps = {
      priceCurrency: data.currency,
      availability: `https://schema.org/${data.availability}`,
      itemCondition: condition,
      priceValidUntil,
      url: data.url,
      seller: { '@type': 'Organization', name: 'Tene' },
      shippingDetails: this.shippingDetails(data.currency),
      hasMerchantReturnPolicy: this.returnPolicy(),
    };

    let offers: object;
    if (data.variants && data.variants.length > 0) {
      const prices = data.variants.map((v) => v.price);
      offers = {
        '@type': 'AggregateOffer',
        ...sharedOfferProps,
        lowPrice: Math.min(...prices).toFixed(2),
        highPrice: Math.max(...prices).toFixed(2),
        offerCount: data.variants.length,
        offers: data.variants.map((v) => ({
          '@type': 'Offer',
          sku: v.sku,
          name: v.name,
          ...sharedOfferProps,
          url: v.url,
          price: v.price.toFixed(2),
        })),
      };
    } else {
      offers = {
        '@type': 'Offer',
        ...sharedOfferProps,
        price: data.price.toFixed(2),
      };
    }

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: data.name,
      description: data.description,
      image: data.image,
      sku: data.sku,
      mpn: data.mpn ?? data.sku,
      ...(data.gtin ? { gtin: data.gtin } : {}),
      brand: data.brand_name
        ? { '@type': 'Brand', name: data.brand_name }
        : undefined,
      offers,
    };

    if (data.aggregateRating && data.aggregateRating.reviewCount > 0) {
      schema['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: data.aggregateRating.ratingValue,
        reviewCount: data.aggregateRating.reviewCount,
      };
    }

    this.injectSchema(schema);
  }

  addBreadcrumbSchema(items: { name: string; url: string }[]): void {
    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };

    this.injectSchema(schema);
  }

  addFaqSchema(items: { question: string; answer: string }[]): void {
    if (!items.length) return;
    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };

    this.injectSchema(schema);
  }

  addOrganizationSchema(data: {
    name: string;
    url: string;
    logo?: string;
    description?: string;
    contactPoint?: { telephone: string; contactType: string; areaServed?: string };
    sameAs?: string[];
    address?: { locality: string; country: string; streetAddress?: string };
  }): void {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org/',
      '@type': 'Organization',
      name: data.name,
      url: data.url,
      logo: data.logo,
      description: data.description,
      sameAs: data.sameAs,
    };
    if (data.contactPoint) {
      schema['contactPoint'] = {
        '@type': 'ContactPoint',
        telephone: data.contactPoint.telephone,
        contactType: data.contactPoint.contactType,
        areaServed: data.contactPoint.areaServed ?? 'GE',
        availableLanguage: ['ka', 'en'],
      };
    }
    if (data.address) {
      schema['address'] = {
        '@type': 'PostalAddress',
        addressLocality: data.address.locality,
        addressCountry: data.address.country,
        ...(data.address.streetAddress ? { streetAddress: data.address.streetAddress } : {}),
      };
    }
    this.injectSchema(schema);
  }

  addWebsiteSchema(data: { name: string; url: string }): void {
    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'WebSite',
      name: data.name,
      url: data.url,
      inLanguage: 'ka-GE',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${data.url}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };
    this.injectSchema(schema);
  }

  addLocalBusinessSchema(data: {
    name: string;
    url: string;
    description?: string;
    image?: string;
    telephone?: string;
    addressLocality: string;
    streetAddress?: string;
    geo?: { latitude: number; longitude: number };
    openingHours?: string[];
    priceRange?: string;
  }): void {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org/',
      '@type': 'ElectronicsStore',
      name: data.name,
      url: data.url,
      description: data.description,
      image: data.image,
      telephone: data.telephone,
      priceRange: data.priceRange ?? '₾₾',
      address: {
        '@type': 'PostalAddress',
        addressLocality: data.addressLocality,
        addressCountry: 'GE',
        ...(data.streetAddress ? { streetAddress: data.streetAddress } : {}),
      },
    };
    if (data.geo) {
      schema['geo'] = {
        '@type': 'GeoCoordinates',
        latitude: data.geo.latitude,
        longitude: data.geo.longitude,
      };
    }
    if (data.openingHours?.length) {
      schema['openingHoursSpecification'] = data.openingHours.map((spec) => ({
        '@type': 'OpeningHoursSpecification',
        ...this.parseOpeningHours(spec),
      }));
    }
    this.injectSchema(schema);
  }

  addBrandSchema(data: { name: string; url: string; description?: string; logo?: string }): void {
    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'Brand',
      name: data.name,
      url: data.url,
      description: data.description,
      logo: data.logo,
    };
    this.injectSchema(schema);
  }

  addCollectionSchema(data: {
    name: string;
    description: string;
    url: string;
    items: { name: string; url: string; image?: string }[];
    total: number;
  }): void {
    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'CollectionPage',
      name: data.name,
      description: data.description,
      url: data.url,
      inLanguage: 'ka-GE',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: data.total,
        itemListElement: data.items.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: p.url,
          name: p.name,
          ...(p.image ? { image: p.image } : {}),
        })),
      },
    };
    this.injectSchema(schema);
  }

  injectRaw(schema: object): void {
    this.injectSchema(schema);
  }

  private shippingDetails(currency: string): object {
    return {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: '0',
        currency,
      },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'GE',
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
      },
    };
  }

  private returnPolicy(): object {
    return {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'GE',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
    };
  }

  private priceValidUntil(daysAhead: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  }

  private parseOpeningHours(spec: string): object {
    // spec example: "Mo-Sa 10:00-20:00"
    const match = spec.match(/^([A-Za-z,-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!match) return { description: spec };
    return {
      dayOfWeek: match[1],
      opens: match[2],
      closes: match[3],
    };
  }

  private injectSchema(schema: object): void {
    const script = this.renderer.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);

    const head = this.document.head;
    if (head) {
      this.renderer.appendChild(head, script);
      this.schemaElements.push(script);
    }
  }

  clearSchemas(): void {
    this.schemaElements.forEach((element) => {
      if (element.parentNode) {
        this.renderer.removeChild(element.parentNode, element);
      }
    });
    this.schemaElements = [];
  }
}
