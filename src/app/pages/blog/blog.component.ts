import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SharedModule } from '@shared/shared.module';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { BlogsService } from '@core/services/blogs/blogs.service';
import { SeoService } from '@core/services/seo/seo.service';
import { SchemaService } from '@core/services/seo/schema.service';
import { BlogListResponse, BlogWithMedia } from '@core/interfaces/admin/blogs.interface';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-blog',
  imports: [SharedModule, BreadcrumbComponent],
  templateUrl: './blog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogComponent {
  private readonly blogsService = inject(BlogsService);
  private readonly seoService = inject(SeoService);
  private readonly schemaService = inject(SchemaService);

  readonly limit = signal(PAGE_SIZE);

  readonly response = rxResource({
    defaultValue: { blogs: [], total: 0, limit: PAGE_SIZE, offset: 0 } as BlogListResponse,
    params: () => this.limit(),
    stream: ({ params: limit }) => this.blogsService.listBlogs(limit, 0),
  });

  readonly blogs = computed(() => this.response.value().blogs);
  readonly total = computed(() => this.response.value().total);

  readonly featured = computed<BlogWithMedia | null>(() => this.blogs()[0] ?? null);
  readonly rest = computed(() => this.blogs().slice(1));

  readonly hasMore = computed(() => this.blogs().length < this.total());
  readonly loadingMore = computed(() => this.response.isLoading() && this.blogs().length > 0);

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'მთავარი', route: '/' },
    { label: 'ბლოგი' },
  ];

  constructor() {
    effect(() => {
      const total = this.total();
      const url = 'https://tene.ge/blog';
      this.seoService.setMetaTags({
        title: 'ბლოგი | Tene',
        description:
          'Tene-ს ბლოგი — სიახლეები, რჩევები და გზამკვლევები ტექნოლოგიებზე, გაჯეტებსა და აქსესუარებზე.',
        url,
        type: 'website',
      });

      this.schemaService.clearSchemas();
      this.schemaService.addBreadcrumbSchema(
        this.breadcrumbs.map((b) => ({
          name: b.label,
          url: b.route ? `https://tene.ge${b.route}` : url,
        })),
      );
      if (total > 0) {
        this.schemaService.addCollectionSchema({
          name: 'Tene ბლოგი',
          description: 'სტატიები და სიახლეები Tene-სგან.',
          url,
          total,
          items: this.blogs()
            .slice(0, 10)
            .map((b) => ({ name: b.title, url: `https://tene.ge/blog/${b.slug}` })),
        });
      }
    });
  }

  loadMore(): void {
    this.limit.update((n) => n + PAGE_SIZE);
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
    const text = blog.content.replace(/<[^>]+>/g, ' ');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }
}
