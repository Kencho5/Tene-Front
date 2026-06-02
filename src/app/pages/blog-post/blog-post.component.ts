import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { BlogsService } from '@core/services/blogs/blogs.service';
import { SeoService } from '@core/services/seo/seo.service';
import { SchemaService } from '@core/services/seo/schema.service';
import { BlogWithMedia } from '@core/interfaces/admin/blogs.interface';

@Component({
  selector: 'app-blog-post',
  imports: [SharedModule, BreadcrumbComponent],
  templateUrl: './blog-post.component.html',
  styleUrl: './blog-post.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogPostComponent {
  private readonly router = inject(Router);
  private readonly blogsService = inject(BlogsService);
  private readonly seoService = inject(SeoService);
  private readonly schemaService = inject(SchemaService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly slug = input.required<string>();

  readonly post = rxResource({
    defaultValue: null as BlogWithMedia | null,
    params: () => this.slug(),
    stream: ({ params: slug }) =>
      this.blogsService.getBlog(slug).pipe(
        catchError(() => {
          this.router.navigate(['/404'], { replaceUrl: true });
          return of(null as BlogWithMedia | null);
        }),
      ),
  });

  readonly blog = computed(() => this.post.value());

  readonly safeContent = computed<SafeHtml>(() => {
    const blog = this.blog();
    return blog ? this.sanitizer.bypassSecurityTrustHtml(blog.content) : '';
  });

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { label: 'მთავარი', route: '/' },
      { label: 'ბლოგი', route: '/blog' },
    ];
    const blog = this.blog();
    if (blog) items.push({ label: blog.title });
    return items;
  });

  constructor() {
    effect(() => {
      const blog = this.blog();
      if (!blog) return;

      const url = `https://tene.ge/blog/${blog.slug}`;
      const description = blog.excerpt || this.plainText(blog.content).slice(0, 155);

      this.seoService.setMetaTags({
        title: `${blog.title} | Tene`,
        description,
        url,
        type: 'article',
        ...(blog.thumbnail ? { image: blog.thumbnail.url, imageAlt: blog.title } : {}),
      });

      this.schemaService.clearSchemas();
      this.schemaService.addBreadcrumbSchema(
        this.breadcrumbs().map((b) => ({
          name: b.label,
          url: b.route ? `https://tene.ge${b.route}` : url,
        })),
      );
      this.schemaService.injectRaw({
        '@context': 'https://schema.org/',
        '@type': 'Article',
        headline: blog.title,
        description,
        inLanguage: 'ka-GE',
        ...(blog.thumbnail ? { image: blog.thumbnail.url } : {}),
        datePublished: blog.published_at ?? blog.created_at,
        dateModified: blog.updated_at,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: { '@type': 'Organization', name: 'Tene' },
        publisher: {
          '@type': 'Organization',
          name: 'Tene',
          logo: { '@type': 'ImageObject', url: 'https://tene.ge/logo.svg' },
        },
      });
    });
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('ka-GE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateString));
  }

  readingTime(blog: BlogWithMedia): number {
    const words = this.plainText(blog.content).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  private plainText(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
