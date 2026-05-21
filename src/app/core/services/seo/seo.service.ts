import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export interface SeoConfig {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  keywords?: string;
}

const SITE_NAME = 'Tene';
const SITE_ORIGIN = 'https://tene.ge';
const DEFAULT_OG_IMAGE = 'https://tene.ge/logo.svg';
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  setTitle(title: string): void {
    this.title.setTitle(this.clamp(title, TITLE_MAX));
  }

  setMetaTags(config: SeoConfig): void {
    if (config.title) {
      const clamped = this.clamp(config.title, TITLE_MAX);
      this.setTitle(clamped);
      this.meta.updateTag({ property: 'og:title', content: clamped });
      this.meta.updateTag({ name: 'twitter:title', content: clamped });
    }

    if (config.description) {
      const desc = this.clamp(this.stripStars(config.description), DESCRIPTION_MAX);
      this.meta.updateTag({ name: 'description', content: desc });
      this.meta.updateTag({ property: 'og:description', content: desc });
      this.meta.updateTag({ name: 'twitter:description', content: desc });
    }

    if (config.keywords) {
      this.meta.updateTag({ name: 'keywords', content: config.keywords });
    }

    const image = config.image || DEFAULT_OG_IMAGE;
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:secure_url', content: image });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({
      property: 'og:image:alt',
      content: config.imageAlt || config.title || SITE_NAME,
    });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    if (config.url) {
      this.meta.updateTag({ property: 'og:url', content: config.url });
      this.updateCanonicalUrl(config.url);
      this.updateHreflang(config.url);
    }

    const ogType = config.type || 'website';
    this.meta.updateTag({ property: 'og:type', content: ogType });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:locale', content: 'ka_GE' });
    this.meta.updateTag({ property: 'og:locale:alternate', content: 'en_US' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:site', content: '@tene_ge' });
    this.meta.updateTag({ name: 'theme-color', content: '#1aa44a' });
  }

  setRobots(noIndex: boolean): void {
    this.meta.updateTag({
      name: 'robots',
      content: noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    });
  }

  private updateCanonicalUrl(url: string): void {
    const head = this.document.querySelector('head');
    if (!head) return;

    let canonicalLink = this.document.querySelector("link[rel='canonical']");
    if (!canonicalLink) {
      canonicalLink = this.document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', url);
  }

  private updateHreflang(url: string): void {
    const head = this.document.querySelector('head');
    if (!head) return;

    const existing = this.document.querySelectorAll("link[rel='alternate'][hreflang]");
    existing.forEach((el) => el.remove());

    const tags: Array<[string, string]> = [
      ['ka', url],
      ['x-default', url],
    ];
    for (const [lang, href] of tags) {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lang);
      link.setAttribute('href', href);
      head.appendChild(link);
    }
  }

  clearMetaTags(): void {
    this.meta.removeTag("name='description'");
    this.meta.removeTag("name='keywords'");
    this.meta.removeTag("property='og:title'");
    this.meta.removeTag("property='og:description'");
    this.meta.removeTag("property='og:image'");
    this.meta.removeTag("property='og:url'");
    this.meta.removeTag("property='og:type'");
    this.meta.removeTag("name='twitter:title'");
    this.meta.removeTag("name='twitter:description'");
    this.meta.removeTag("name='twitter:image'");
  }

  private clamp(value: string, max: number): string {
    const v = value.trim().replace(/\s+/g, ' ');
    if (v.length <= max) return v;
    const cut = v.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
  }

  private stripStars(value: string): string {
    return value.replace(/[★☆]/g, '·').replace(/\s*·\s*·\s*/g, ' · ');
  }
}
