import {
  Injectable,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { isPlatformBrowser } from '@angular/common';
import {
  AuthResponse,
  RegisterFields,
  User,
} from '@core/interfaces/auth.interface';
import { apiUrl } from '@utils/buildUrl';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  // Signal-based state management
  private readonly userSignal = signal<User | null>(null);

  // Public readonly signals
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isTokenExpired = computed(() => {
    const currentUser = this.userSignal();
    if (!currentUser?.exp) return true;
    return Date.now() >= currentUser.exp * 1000;
  });

  constructor() {
    this.initUser();
  }

  private initUser(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.getStoredToken();
      if (token) {
        const decodedUser = this.decodeToken(token);
        if (decodedUser && !this.isTokenExpiredCheck(decodedUser)) {
          this.userSignal.set(decodedUser);
        } else {
          this.clearStoredToken();
        }
      }
    }
  }

  register(userData: RegisterFields): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(apiUrl('/auth/register'), userData);
  }

  login(token: string): void {
    const decodedUser = this.decodeToken(token);
    if (decodedUser) {
      this.userSignal.set(decodedUser);
      this.storeToken(token);
      this.router.navigate(['/dashboard']);
    }
  }

  logout(): void {
    this.userSignal.set(null);
    this.clearStoredToken();
    this.router.navigate(['/auth/login']);
  }

  private decodeToken(token: string | null): User | null {
    if (!token) return null;

    try {
      return jwtDecode<User>(token);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  private isTokenExpiredCheck(user: User): boolean {
    return Date.now() >= user.exp * 1000;
  }

  private getStoredToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('token');
  }

  private storeToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }
  }

  private clearStoredToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
  }
}
