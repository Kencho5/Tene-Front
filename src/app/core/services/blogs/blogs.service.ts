import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BlogListResponse, BlogWithMedia } from '@core/interfaces/admin/blogs.interface';

@Injectable({
  providedIn: 'root',
})
export class BlogsService {
  private readonly http = inject(HttpClient);

  listBlogs(limit?: number, offset?: number): Observable<BlogListResponse> {
    let params = new HttpParams();
    if (limit != null) params = params.set('limit', String(limit));
    if (offset != null) params = params.set('offset', String(offset));
    return this.http.get<BlogListResponse>('/blogs', { params });
  }

  getBlog(slug: string): Observable<BlogWithMedia> {
    return this.http.get<BlogWithMedia>(`/blogs/${slug}`);
  }
}
