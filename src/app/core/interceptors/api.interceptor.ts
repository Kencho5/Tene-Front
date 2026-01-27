import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '@environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const hasProtocol = req.url.startsWith('http://') || req.url.startsWith('https://');
  const isApiUrl = req.url.startsWith(environment.apiUrl);

  if (hasProtocol && !isApiUrl) {
    return next(req);
  }

  const apiReq = req.clone({ url: `${environment.apiUrl}${req.url}` });
  return next(apiReq);
};
