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
  LoginFields,
  RegisterFields,
  User,
} from '@core/interfaces/auth.interface';

const TOKEN_KEY = 'token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly userSignal = signal<User | null>(null);
  private readonly tokenSignal = signal<string | null>(null);

  readonly user = this.userSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => {
    const user = this.userSignal();
    return user !== null && !this.isExpired(user);
  });

  constructor() {
    this.initializeAuth();
  }

  // API Methods
  register(userData: RegisterFields): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/register', userData);
  }

  login(userData: LoginFields): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', userData);
  }

  authorizeGoogle(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/google-login', {
      id_token: idToken,
    });
  }

  setAuth(token: string): void {
    const user = this.decodeToken(token);

    if (!user || this.isExpired(user)) {
      console.error('Invalid or expired token');
      this.userSignal.set(null);
      this.tokenSignal.set(null);
      if (this.isBrowser) localStorage.removeItem(TOKEN_KEY);
      return;
    }

    this.userSignal.set(user);
    this.tokenSignal.set(token);
    if (this.isBrowser) localStorage.setItem(TOKEN_KEY, token);
    this.router.navigate(['/profile']);
  }

  logout(): void {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    if (this.isBrowser) localStorage.removeItem(TOKEN_KEY);
    this.router.navigate(['/auth/login']);
  }

  private initializeAuth(): void {
    if (!this.isBrowser) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const user = this.decodeToken(token);
    if (!user || this.isExpired(user)) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }

    this.userSignal.set(user);
    this.tokenSignal.set(token);
  }

  private decodeToken(token: string): User | null {
    try {
      return jwtDecode<User>(token);
    } catch (error) {
      console.error('Token decode failed:', error);
      return null;
    }
  }

  private isExpired(user: User): boolean {
    if (!user.exp) return true;
    return Date.now() >= user.exp * 1000;
  }
}
