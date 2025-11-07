import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth-service.service';
import { environment } from '@environments/environment';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private isLoaded = false;
  private readonly authService = inject(AuthService);

  private async loadGoogleScript(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).google) {
        this.isLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      script.onerror = () =>
        reject(new Error('Failed to load Google Auth script'));

      document.head.appendChild(script);
    });
  }

  async preloadScript(): Promise<void> {
    try {
      await this.loadGoogleScript();
    } catch (error) {
      console.error('Failed to preload Google Auth script:', error);
    }
  }

  async init(): Promise<void> {
    try {
      await this.loadGoogleScript();

      return new Promise((resolve, reject) => {
        const parent = document.createElement('div');
        parent.style.position = 'fixed';
        parent.style.top = '0';
        parent.style.left = '0';
        parent.style.width = '0';
        parent.style.height = '0';
        parent.style.opacity = '0';
        parent.style.pointerEvents = 'none';
        parent.style.overflow = 'hidden';
        document.body.appendChild(parent);

        const cleanup = () => {
          parent.remove();
          // Remove Google's injected styles
          const googleStyles = document.getElementById('googleidentityservice_button_styles');
          if (googleStyles) {
            googleStyles.remove();
          }
        };

        const callback = (response: any) => {
          const idToken = response.credential;
          if (!idToken) {
            cleanup();
            reject(new Error('No ID token received'));
            return;
          }

          this.authService.authorizeGoogle(idToken).subscribe({
            next: (authResponse) => {
              cleanup();
              this.authService.authorize(authResponse.token);
              resolve();
            },
            error: (error) => {
              cleanup();
              reject(error);
            },
          });
        };

        google.accounts.id.initialize({
          client_id: environment.google_client_id,
          callback,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        google.accounts.id.renderButton(parent, {
          type: 'standard',
          size: 'large',
        });

        setTimeout(() => {
          const button = parent.querySelector(
            'div[role="button"]',
          ) as HTMLElement;
          if (button) {
            button.click();
          } else {
            cleanup();
            reject(new Error('Failed to render Google button'));
          }
        }, 100);
      });
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error);
      throw error;
    }
  }
}
