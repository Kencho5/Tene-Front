import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '@environments/environment';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const hasProtocol = req.url.startsWith('http://') || req.url.startsWith('https://');
  const isApiUrl = req.url.startsWith(environment.apiUrl);

  if (hasProtocol && !isApiUrl) {
    return next(req);
  }

  const platformId = inject(PLATFORM_ID);
  const token = isPlatformBrowser(platformId) ? localStorage.getItem('token') : null;

  const request = req.clone({
    setHeaders: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return next(request);
};
