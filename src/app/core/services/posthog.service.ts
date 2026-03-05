import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import type { PostHog, Properties } from 'posthog-js';

@Injectable({
  providedIn: 'root',
})
export class PosthogService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private posthog: PostHog | null = null;
  private readonly isProd = environment.branch == 'main';

  async init(): Promise<void> {
    if (this.posthog || !this.isBrowser || !this.isProd) {
      return;
    }

    if (!environment.posthog_key) {
      console.warn('PostHog API key not found in environment');
      return;
    }

    try {
      const { default: posthog } = await import('posthog-js');

      posthog.init(environment.posthog_key, {
        api_host: 'https://eu.i.posthog.com',
        capture_pageview: true,
        autocapture: true,
      });

      this.posthog = posthog;
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
    }
  }

  identify(userId: string, properties?: Properties): void {
    this.posthog?.identify(userId, properties);
  }

  reset(): void {
    this.posthog?.reset();
  }
}
