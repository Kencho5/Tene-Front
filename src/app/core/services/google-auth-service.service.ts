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

  async init() {
    try {
      await this.loadGoogleScript();

      const callback = (res: any) => {
        const token = res.access_token;
        if (!token) return;
        this.authService.registerGoogle(token).subscribe((response) => {
          this.authService.login(response.token);
        });
      };

      google.accounts.oauth2
        .initTokenClient({
          client_id: environment.google_client_id,
          scope: 'openid email profile',
          callback,
        })
        .requestAccessToken();
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error);
    }
  }
}
