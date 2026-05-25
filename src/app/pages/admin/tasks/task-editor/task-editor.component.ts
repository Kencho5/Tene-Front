import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { AdminService } from '@core/services/admin/admin.service';
import { CompressImageService } from '@core/services/compress-image.service';
import { ToastService } from '@core/services/toast.service';
import {
  Task,
  TaskCreatePayload,
  TaskMedia,
  TaskMediaType,
  TaskMediaUploadItem,
  TaskPriority,
  TaskState,
  TaskUpdatePayload,
} from '@core/interfaces/admin/tasks.interface';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { SpinnerComponent } from '@shared/components/ui/spinner/spinner.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, finalize, forkJoin, mergeMap, Observable, of, tap } from 'rxjs';

interface TaskFormFields {
  title: string;
  description: string;
}

interface PendingUpload {
  id: string;
  file: File;
  media_type: TaskMediaType;
  previewUrl: string;
  progress: number;
  error?: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg', 'audio/wav'];
const ALL_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, ...AUDIO_TYPES];

function classifyType(contentType: string): TaskMediaType | null {
  if (IMAGE_TYPES.includes(contentType)) return 'image';
  if (VIDEO_TYPES.includes(contentType)) return 'video';
  if (AUDIO_TYPES.includes(contentType)) return 'audio';
  return null;
}

@Component({
  selector: 'app-task-editor',
  imports: [SharedModule, FormField, DropdownComponent, InputComponent, SpinnerComponent],
  templateUrl: './task-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'task-editor-title',
  },
})
export class TaskEditorComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly compressImageService = inject(CompressImageService);
  private readonly toastService = inject(ToastService);

  readonly task = input<Task | null>(null);
  readonly initialState = input<TaskState>('todo');
  readonly mode = input<'view' | 'edit' | 'create'>('edit');

  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly modeChange = output<'view' | 'edit' | 'create'>();

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly submitted = signal(false);
  readonly saving = signal(false);
  readonly dragOver = signal(false);

  readonly state = signal<TaskState>('todo');
  readonly priority = signal<TaskPriority>('medium');

  readonly savedMedia = signal<TaskMedia[]>([]);
  readonly mediaToDelete = signal<Set<string>>(new Set());
  readonly pending = signal<PendingUpload[]>([]);
  readonly viewerMedia = signal<TaskMedia | null>(null);

  readonly visibleSavedMedia = computed(() =>
    this.savedMedia().filter((m) => !this.mediaToDelete().has(m.media_uuid)),
  );

  readonly model = signal<TaskFormFields>({ title: '', description: '' });

  readonly taskForm = form(this.model, (path) => {
    required(path.title, { message: 'სათაური აუცილებელია' });
  });

  readonly isEdit = computed(() => this.task() !== null);
  readonly isView = computed(() => this.mode() === 'view');

  switchToEdit(): void {
    this.modeChange.emit('edit');
  }

  readonly markingDone = signal(false);

  readonly canMarkDone = computed(() => this.task() !== null && this.task()!.state !== 'done');

  markDone(): void {
    const existing = this.task();
    if (!existing || this.markingDone() || existing.state === 'done') return;

    this.markingDone.set(true);
    this.adminService
      .updateTaskState(existing.id, 'done')
      .pipe(
        tap(() => this.toastService.add('წარმატება', 'დავალება შესრულდა', 2500, 'success')),
        catchError((err) => {
          this.toastService.add('შეცდომა', err.error?.error || 'ვერ განახლდა', 3000, 'error');
          return of(null);
        }),
        finalize(() => this.markingDone.set(false)),
      )
      .subscribe((res) => {
        if (res) this.saved.emit();
      });
  }

  readonly errorMessage = computed(() => {
    const errors = this.taskForm().errorSummary();
    return errors.length > 0 ? errors[0].message || 'შეავსეთ ველები' : '';
  });

  readonly stateOptions: ComboboxItems[] = [
    { label: 'გასაკეთებელი', value: 'todo' },
    { label: 'მიმდინარე', value: 'in_progress' },
    { label: 'შემოწმება', value: 'review' },
    { label: 'შესრულებული', value: 'done' },
  ];

  readonly priorityOptions: ComboboxItems[] = [
    { label: 'დაბალი', value: 'low' },
    { label: 'საშუალო', value: 'medium' },
    { label: 'მაღალი', value: 'high' },
    { label: 'სასწრაფო', value: 'urgent' },
  ];

  readonly stateLabel = computed(
    () => this.stateOptions.find((o) => o.value === this.state())?.label ?? '',
  );
  readonly priorityLabel = computed(
    () => this.priorityOptions.find((o) => o.value === this.priority())?.label ?? '',
  );

  private readonly stateMetaMap: Record<TaskState, { classes: string; dot: string }> = {
    todo: { classes: 'bg-platinum-10 text-platinum-70 border border-platinum-30/60', dot: 'bg-platinum-50' },
    in_progress: { classes: 'bg-blue-50 text-blue-700 border border-blue-200/70', dot: 'bg-blue-500' },
    review: { classes: 'bg-amber-50 text-amber-700 border border-amber-200/70', dot: 'bg-amber-500' },
    done: { classes: 'bg-green-10 text-green-70 border border-green-30/70', dot: 'bg-green-60' },
  };
  private readonly priorityMetaMap: Record<TaskPriority, { classes: string }> = {
    low: { classes: 'bg-platinum-10 text-platinum-60 border border-platinum-30/60' },
    medium: { classes: 'bg-blue-50 text-blue-700 border border-blue-200/70' },
    high: { classes: 'bg-amber-50 text-amber-700 border border-amber-200/70' },
    urgent: { classes: 'bg-valencia-10 text-valencia-60 border border-valencia-30/60' },
  };

  readonly stateMeta = computed(() => this.stateMetaMap[this.state()]);
  readonly priorityMeta = computed(() => this.priorityMetaMap[this.priority()]);

  private formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('ka-GE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  readonly createdAt = computed(() => {
    const t = this.task();
    return t ? this.formatDate(t.created_at) : '—';
  });

  readonly acceptList = ALL_TYPES.join(',');

  ngOnInit(): void {
    const t = this.task();
    if (t) {
      this.model.set({ title: t.title, description: t.description ?? '' });
      this.state.set(t.state);
      this.priority.set(t.priority);
      this.savedMedia.set(t.media);
    } else {
      this.state.set(this.initialState());
    }
  }

  onStateChange(value: string | undefined): void {
    if (value) this.state.set(value as TaskState);
  }

  onPriorityChange(value: string | undefined): void {
    if (value) this.priority.set(value as TaskPriority);
  }

  triggerPicker(): void {
    this.fileInput().nativeElement.click();
  }

  onDropZoneKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.triggerPicker();
    }
  }

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer?.files) this.addFiles(Array.from(event.dataTransfer.files));
  }

  private async addFiles(files: File[]): Promise<void> {
    for (const file of files) {
      const mediaType = classifyType(file.type);
      if (!mediaType) {
        this.toastService.add(
          'შეცდომა',
          `ფაილის ფორმატი არ არის მხარდაჭერილი: ${file.name}`,
          3000,
          'error',
        );
        continue;
      }

      let finalFile = file;
      if (mediaType === 'image') {
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
      }

      this.pending.update((p) => [
        ...p,
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          file: finalFile,
          media_type: mediaType,
          previewUrl: URL.createObjectURL(finalFile),
          progress: 0,
        },
      ]);
    }
  }

  removePending(id: string): void {
    const item = this.pending().find((p) => p.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    this.pending.update((p) => p.filter((x) => x.id !== id));
  }

  markSavedMediaForDelete(media: TaskMedia): void {
    this.mediaToDelete.update((set) => {
      const next = new Set(set);
      next.add(media.media_uuid);
      return next;
    });
  }

  onEscape(): void {
    if (this.viewerMedia()) {
      this.closeViewer();
      return;
    }
    this.close();
  }

  openViewer(media: TaskMedia, event: Event): void {
    event.stopPropagation();
    this.viewerMedia.set(media);
  }

  closeViewer(): void {
    this.viewerMedia.set(null);
  }

  close(): void {
    for (const p of this.pending()) URL.revokeObjectURL(p.previewUrl);
    this.closed.emit();
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);
    if (this.saving()) return;

    submit(this.taskForm, async () => {
      this.saving.set(true);
      const values = this.model();
      const existing = this.task();

      if (existing) {
        const payload: TaskUpdatePayload = {
          title: values.title.trim(),
          description: values.description,
          state: this.state(),
          priority: this.priority(),
        };
        this.adminService
          .updateTask(existing.id, payload)
          .pipe(
            tap(() => this.toastService.add('წარმატება', 'დავალება განახლდა', 2500, 'success')),
            catchError((err) => {
              this.toastService.add('შეცდომა', err.error?.error || 'ვერ განახლდა', 3000, 'error');
              return of(null);
            }),
          )
          .subscribe((res) => {
            if (!res) {
              this.saving.set(false);
              return;
            }
            this.deletePendingRemovals(existing.id).subscribe(() => this.uploadPending(existing.id));
          });
      } else {
        const payload: TaskCreatePayload = {
          title: values.title.trim(),
          description: values.description || null,
          state: this.state(),
          priority: this.priority(),
        };
        this.adminService
          .createTask(payload)
          .pipe(
            catchError((err) => {
              this.toastService.add('შეცდომა', err.error?.error || 'ვერ შეიქმნა', 3000, 'error');
              return of(null);
            }),
          )
          .subscribe((res) => {
            if (!res) {
              this.saving.set(false);
              return;
            }
            this.toastService.add('წარმატება', 'დავალება შეიქმნა', 2500, 'success');
            this.uploadPending(res.id);
          });
      }
    });
  }

  private deletePendingRemovals(taskId: number): Observable<unknown> {
    const uuids = Array.from(this.mediaToDelete());
    if (uuids.length === 0) return of(null);
    return forkJoin(
      uuids.map((uuid) =>
        this.adminService.deleteTaskMedia(taskId, uuid).pipe(
          tap(() => {
            this.savedMedia.update((arr) => arr.filter((m) => m.media_uuid !== uuid));
          }),
          catchError(() => of(null)),
        ),
      ),
    ).pipe(
      tap(() => {
        this.mediaToDelete.set(new Set());
      }),
    );
  }

  private uploadPending(taskId: number): void {
    const pending = this.pending();
    if (pending.length === 0) {
      this.saving.set(false);
      this.saved.emit();
      return;
    }

    const items: TaskMediaUploadItem[] = pending.map((p) => ({
      media_type: p.media_type,
      content_type: p.file.type,
    }));

    this.adminService
      .getTaskMediaPresignedUrls(taskId, items)
      .pipe(
        mergeMap((res) => {
          const uploads = res.media.map((entry, idx) =>
            this.adminService.uploadToS3WithProgress(entry.upload_url, pending[idx].file).pipe(
              tap(({ progress }) => {
                this.pending.update((arr) =>
                  arr.map((p) => (p.id === pending[idx].id ? { ...p, progress } : p)),
                );
              }),
              catchError(() => {
                this.pending.update((arr) =>
                  arr.map((p) =>
                    p.id === pending[idx].id ? { ...p, error: 'ატვირთვა ვერ მოხერხდა' } : p,
                  ),
                );
                return of(null);
              }),
            ),
          );
          return forkJoin(uploads);
        }),
        catchError((err) => {
          this.toastService.add(
            'შეცდომა',
            err.error?.error || 'მედია ბმულების მიღება ვერ მოხერხდა',
            3000,
            'error',
          );
          return of(null);
        }),
        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe((res) => {
        if (res) {
          this.toastService.add('წარმატება', 'მედია აიტვირთა', 2500, 'success');
        }
        this.saved.emit();
      });
  }
}
