import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { ToastService } from '@core/services/toast.service';
import { SharedModule } from '@shared/shared.module';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { RichTextEditorComponent } from '@shared/components/ui/rich-text-editor/rich-text-editor.component';
import {
  catchError,
  finalize,
  firstValueFrom,
  forkJoin,
  mergeMap,
  Observable,
  of,
  switchMap,
} from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { CompressImageService } from '@core/services/compress-image.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { generateSlug } from '@utils/slug';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import {
  BlogCreatePayload,
  BlogMedia,
  BlogMediaType,
  BlogMediaUploadItem,
  BlogStatus,
  BlogUpdatePayload,
} from '@core/interfaces/admin/blogs.interface';

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
}

interface PendingMedia {
  id: string;
  file: File;
  media_type: BlogMediaType;
  previewUrl: string;
  isThumbnail: boolean;
}

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

@Component({
  selector: 'app-admin-blog-form',
  imports: [SharedModule, DropdownComponent, FormField, RichTextEditorComponent],
  templateUrl: './admin-blog-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBlogFormComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private readonly compressImageService = inject(CompressImageService);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly slugTouched = signal(false);

  readonly status = signal<BlogStatus>('draft');
  readonly statusOptions: ComboboxItems[] = [
    { label: 'დრაფტი', value: 'draft' },
    { label: 'გამოქვეყნებული', value: 'published' },
  ];

  readonly savedMedia = signal<BlogMedia[]>([]);
  readonly mediaToDelete = signal<Set<string>>(new Set());
  readonly pending = signal<PendingMedia[]>([]);

  readonly acceptList = IMAGE_TYPES.join(',');

  readonly routeBlogId = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  });

  readonly draftBlogId = signal<number | null>(null);
  readonly effectiveBlogId = computed(() => this.routeBlogId() ?? this.draftBlogId());

  readonly blogId = this.routeBlogId;
  readonly isEditMode = computed(() => this.routeBlogId() !== null);
  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'ბლოგის რედაქტირება' : 'ახალი ბლოგი',
  );

  readonly blogModel = signal<BlogFormData>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
  });

  readonly blogForm = form(this.blogModel, (fieldPath) => {
    required(fieldPath.title, { message: 'სათაური აუცილებელია' });
    required(fieldPath.content, { message: 'შინაარსი აუცილებელია' });
  });

  readonly blog = toSignal(
    toObservable(this.blogId).pipe(
      switchMap((id) =>
        id ? this.adminService.getBlog(id).pipe(catchError(() => of(null))) : of(null),
      ),
    ),
  );

  readonly visibleSavedMedia = computed(() =>
    this.savedMedia().filter((m) => !this.mediaToDelete().has(m.media_uuid)),
  );

  readonly pendingThumbnailChosen = computed(() => this.pending().some((p) => p.isThumbnail));

  readonly hasThumbnail = computed(
    () =>
      this.visibleSavedMedia().some((m) => m.is_thumbnail) || this.pendingThumbnailChosen(),
  );

  constructor() {
    effect(() => {
      const blog = this.blog();
      if (this.isEditMode() && blog) {
        this.blogModel.set({
          title: blog.title,
          slug: blog.slug,
          excerpt: blog.excerpt ?? '',
          content: blog.content,
        });
        this.status.set(blog.status);
        this.savedMedia.set(blog.media);
        this.slugTouched.set(true);
      }
    });
  }

  onTitleInput(): void {
    if (this.slugTouched()) return;
    const title = this.blogModel().title;
    this.blogModel.update((m) => ({ ...m, slug: generateSlug(title) }));
  }

  onSlugInput(): void {
    this.slugTouched.set(true);
  }

  onStatusChange(value: string | undefined): void {
    if (value === 'draft' || value === 'published') this.status.set(value);
  }

  onContentChanged(html: string): void {
    this.blogForm.content().value.set(html);
  }

  readonly uploadInEditor = async (file: File): Promise<string> => {
    const finalFile = await this.compressImageService.compressImage(
      file,
      0.7,
      2000,
      2000,
      'image/webp',
    );

    const blogId = await this.ensureBlogId();

    const presigned = await firstValueFrom(
      this.adminService.getBlogMediaPresignedUrls(blogId, [
        { media_type: 'image', content_type: finalFile.type },
      ]),
    );
    const entry = presigned.media[0];
    await firstValueFrom(this.adminService.uploadToS3(entry.upload_url, finalFile));

    return entry.public_url;
  };

  private async ensureBlogId(): Promise<number> {
    const existing = this.effectiveBlogId();
    if (existing !== null) return existing;

    const values = this.blogModel();
    const created = await firstValueFrom(
      this.adminService.createBlog({
        title: values.title.trim() || 'უსათაურო',
        content: values.content || '',
        status: 'draft',
      }),
    );
    this.draftBlogId.set(created.id);
    return created.id;
  }

  onUploadError(message: string): void {
    this.toastService.add('შეცდომა', message, 3000, 'error');
  }

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  private async addFiles(files: File[]): Promise<void> {
    for (const file of files) {
      if (!IMAGE_TYPES.includes(file.type)) {
        this.toastService.add(
          'შეცდომა',
          `მხოლოდ სურათებია დაშვებული: ${file.name}`,
          3000,
          'error',
        );
        continue;
      }

      let finalFile = file;
      try {
        finalFile = await this.compressImageService.compressImage(
          file,
          0.7,
          2000,
          2000,
          'image/webp',
        );
      } catch {
        this.toastService.add('შეცდომა', 'სურათის შეკუმშვა ვერ მოხერხდა', 3000, 'error');
        continue;
      }

      const isFirst = !this.hasThumbnail();
      this.pending.update((p) => [
        ...p,
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          file: finalFile,
          media_type: 'image',
          previewUrl: URL.createObjectURL(finalFile),
          isThumbnail: isFirst,
        },
      ]);
    }
  }

  removePending(id: string): void {
    const item = this.pending().find((p) => p.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    this.pending.update((p) => p.filter((x) => x.id !== id));
  }

  markSavedForDelete(media: BlogMedia): void {
    this.mediaToDelete.update((set) => {
      const next = new Set(set);
      next.add(media.media_uuid);
      return next;
    });
  }

  setPendingThumbnail(id: string): void {
    this.pending.update((p) => p.map((x) => ({ ...x, isThumbnail: x.id === id })));
  }

  readonly thumbnailUpdating = signal<string | null>(null);

  setSavedThumbnail(media: BlogMedia): void {
    const blogId = this.effectiveBlogId();
    if (blogId === null || media.is_thumbnail || this.thumbnailUpdating()) return;

    this.thumbnailUpdating.set(media.media_uuid);
    this.adminService
      .setBlogMediaThumbnail(blogId, media.media_uuid, true)
      .pipe(
        catchError((error) => {
          this.toastService.add(
            'შეცდომა',
            error.error?.error || 'მთავარი სურათის შეცვლა ვერ მოხერხდა',
            3000,
            'error',
          );
          return of(null);
        }),
        finalize(() => this.thumbnailUpdating.set(null)),
      )
      .subscribe((blog) => {
        if (!blog) return;
        this.savedMedia.set(blog.media);
        this.pending.update((p) => p.map((x) => ({ ...x, isThumbnail: false })));
      });
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    if (this.blogForm().invalid()) {
      const errors = this.blogForm().errorSummary();
      const errorMessage =
        errors.length > 0 && errors[0].message
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';
      this.toastService.add('ბლოგის შენახვა ვერ მოხერხდა', errorMessage, 5000, 'error');
      return;
    }

    this.isLoading.set(true);
    const values = this.blogModel();
    const existingId = this.effectiveBlogId();

    const request: Observable<{ id: number }> =
      existingId !== null
        ? this.adminService.updateBlog(existingId, this.buildUpdatePayload(values))
        : this.adminService.createBlog(this.buildCreatePayload(values));

    request
      .pipe(
        switchMap((blog) =>
          this.deletePendingRemovals(blog.id).pipe(
            switchMap(() => this.uploadPending(blog.id)),
            switchMap(() => of(blog)),
          ),
        ),
        catchError((error) => {
          this.handleError(error);
          return of(null);
        }),
      )
      .subscribe((blog) => {
        if (blog) {
          this.isLoading.set(false);
          this.toastService.add(
            'წარმატებული',
            existingId !== null ? 'ბლოგი წარმატებით განახლდა' : 'ბლოგი წარმატებით დაემატა',
            3000,
            'success',
          );
          this.router.navigate(['/admin/blogs']);
        }
      });
  }

  private buildCreatePayload(values: BlogFormData): BlogCreatePayload {
    const payload: BlogCreatePayload = {
      title: values.title.trim(),
      content: values.content,
      status: this.status(),
    };
    const slug = values.slug.trim();
    if (slug) payload.slug = slug;
    const excerpt = values.excerpt.trim();
    if (excerpt) payload.excerpt = excerpt;
    return payload;
  }

  private buildUpdatePayload(values: BlogFormData): BlogUpdatePayload {
    return {
      title: values.title.trim(),
      slug: values.slug.trim(),
      excerpt: values.excerpt.trim(),
      content: values.content,
      status: this.status(),
    };
  }

  private deletePendingRemovals(blogId: number): Observable<unknown> {
    const uuids = Array.from(this.mediaToDelete());
    if (uuids.length === 0) return of(null);
    return forkJoin(
      uuids.map((uuid) =>
        this.adminService.deleteBlogMedia(blogId, uuid).pipe(catchError(() => of(null))),
      ),
    );
  }

  private uploadPending(blogId: number): Observable<unknown> {
    const pending = this.pending();
    if (pending.length === 0) return of(null);

    const items: BlogMediaUploadItem[] = pending.map((p) => ({
      media_type: p.media_type,
      content_type: p.file.type,
      ...(p.isThumbnail ? { is_thumbnail: true } : {}),
    }));

    return this.adminService.getBlogMediaPresignedUrls(blogId, items).pipe(
      mergeMap((res) => {
        const uploads = res.media.map((entry, idx) =>
          this.adminService.uploadToS3(entry.upload_url, pending[idx].file),
        );
        return uploads.length > 0 ? forkJoin(uploads) : of([]);
      }),
    );
  }

  private handleError(error: { error?: { error?: string } }): void {
    this.isLoading.set(false);
    this.toastService.add(
      'შეცდომა',
      error.error?.error || 'ბლოგის შენახვა ვერ მოხერხდა',
      5000,
      'error',
    );
  }

  cancel(): void {
    this.router.navigate(['/admin/blogs']);
  }
}
