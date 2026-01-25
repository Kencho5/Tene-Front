import { Injectable, inject, Renderer2, RendererFactory2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';

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
    image: string;
    sku: string;
    brand?: string;
    price: number;
    currency: string;
    availability: 'InStock' | 'OutOfStock' | 'PreOrder';
    url: string;
  }): void {
    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: data.name,
      description: data.description,
      image: data.image,
      sku: data.sku,
      brand: data.brand
        ? {
            '@type': 'Brand',
            name: data.brand,
          }
        : undefined,
      offers: {
        '@type': 'Offer',
        url: data.url,
        priceCurrency: data.currency,
        price: data.price.toFixed(2),
        availability: `https://schema.org/${data.availability}`,
      },
    };

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

  addOrganizationSchema(data: {
    name: string;
    url: string;
    logo?: string;
    contactPoint?: { telephone: string; contactType: string };
    sameAs?: string[];
  }): void {
    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'Organization',
      name: data.name,
      url: data.url,
      logo: data.logo,
      contactPoint: data.contactPoint
        ? {
            '@type': 'ContactPoint',
            telephone: data.contactPoint.telephone,
            contactType: data.contactPoint.contactType,
          }
        : undefined,
      sameAs: data.sameAs,
    };

    this.injectSchema(schema);
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
