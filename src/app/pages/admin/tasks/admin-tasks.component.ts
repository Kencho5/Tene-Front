import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import {
  Task,
  TaskListResponse,
  TaskPriority,
  TaskState,
} from '@core/interfaces/admin/tasks.interface';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, of, tap } from 'rxjs';
import { TaskCardComponent } from './task-card/task-card.component';
import { TaskEditorComponent } from './task-editor/task-editor.component';

interface Column {
  state: TaskState;
  label: string;
  accent: string;
}

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-tasks',
  imports: [
    SharedModule,
    FormsModule,
    DropdownComponent,
    ConfirmationModalComponent,
    TaskCardComponent,
    TaskEditorComponent,
  ],
  templateUrl: './admin-tasks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTasksComponent {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly pageSize = PAGE_SIZE;

  readonly priorityFilter = signal<TaskPriority | undefined>(undefined);

  readonly collapsed = signal<Record<TaskState, boolean>>({
    todo: false,
    in_progress: false,
    review: false,
    done: false,
  });

  readonly offsets = signal<Record<TaskState, number>>({
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  });

  toggleCollapse(state: TaskState): void {
    this.collapsed.update((c) => ({ ...c, [state]: !c[state] }));
  }

  readonly editorOpen = signal(false);
  readonly editingTask = signal<Task | null>(null);
  readonly editorInitialState = signal<TaskState>('todo');
  readonly editorMode = signal<'view' | 'edit' | 'create'>('view');

  readonly deleteOpen = signal(false);
  readonly taskToDelete = signal<number | null>(null);

  readonly columns: Column[] = [
    { state: 'todo', label: 'გასაკეთებელი', accent: 'bg-platinum-40' },
    { state: 'in_progress', label: 'მიმდინარე', accent: 'bg-blue-500' },
    { state: 'review', label: 'შემოწმება', accent: 'bg-amber-500' },
    { state: 'done', label: 'შესრულებული', accent: 'bg-green-60' },
  ];

  readonly priorityOptions: ComboboxItems[] = [
    { label: 'ყველა პრიორიტეტი', value: 'all' },
    { label: 'დაბალი', value: 'low' },
    { label: 'საშუალო', value: 'medium' },
    { label: 'მაღალი', value: 'high' },
    { label: 'სასწრაფო', value: 'urgent' },
  ];

  private readonly emptyResponse = (state: TaskState): TaskListResponse => ({
    tasks: [],
    total: 0,
    limit: PAGE_SIZE,
    offset: this.offsets()[state],
  });

  private readonly columnResource = (state: TaskState) =>
    rxResource({
      defaultValue: this.emptyResponse(state),
      params: () => ({
        state,
        priority: this.priorityFilter(),
        offset: this.offsets()[state],
      }),
      stream: ({ params }) =>
        this.adminService.listTasks({
          state: params.state,
          priority: params.priority,
          limit: PAGE_SIZE,
          offset: params.offset,
        }),
    });

  readonly resources: Record<TaskState, ReturnType<typeof this.columnResource>> = {
    todo: this.columnResource('todo'),
    in_progress: this.columnResource('in_progress'),
    review: this.columnResource('review'),
    done: this.columnResource('done'),
  };

  readonly total = computed(
    () =>
      this.resources.todo.value().total +
      this.resources.in_progress.value().total +
      this.resources.review.value().total +
      this.resources.done.value().total,
  );

  tasksFor(state: TaskState): Task[] {
    return this.resources[state].value().tasks;
  }

  totalFor(state: TaskState): number {
    return this.resources[state].value().total;
  }

  pageInfo(state: TaskState): { from: number; to: number; total: number } {
    const total = this.totalFor(state);
    const offset = this.offsets()[state];
    const count = this.tasksFor(state).length;
    return {
      from: total === 0 ? 0 : offset + 1,
      to: offset + count,
      total,
    };
  }

  canPrev(state: TaskState): boolean {
    return this.offsets()[state] > 0;
  }

  canNext(state: TaskState): boolean {
    return this.offsets()[state] + PAGE_SIZE < this.totalFor(state);
  }

  prevPage(state: TaskState): void {
    if (!this.canPrev(state)) return;
    this.offsets.update((o) => ({ ...o, [state]: Math.max(0, o[state] - PAGE_SIZE) }));
  }

  nextPage(state: TaskState): void {
    if (!this.canNext(state)) return;
    this.offsets.update((o) => ({ ...o, [state]: o[state] + PAGE_SIZE }));
  }

  onPriorityChange(value: string | undefined): void {
    this.priorityFilter.set(!value || value === 'all' ? undefined : (value as TaskPriority));
    this.offsets.set({ todo: 0, in_progress: 0, review: 0, done: 0 });
  }

  openNew(state: TaskState): void {
    this.editingTask.set(null);
    this.editorInitialState.set(state);
    this.editorMode.set('create');
    this.editorOpen.set(true);
  }

  openView(task: Task): void {
    this.editingTask.set(task);
    this.editorMode.set('view');
    this.editorOpen.set(true);
  }

  openEdit(task: Task): void {
    this.editingTask.set(task);
    this.editorMode.set('edit');
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editingTask.set(null);
  }

  private reloadAll(): void {
    this.resources.todo.reload();
    this.resources.in_progress.reload();
    this.resources.review.reload();
    this.resources.done.reload();
  }

  onSaved(): void {
    this.closeEditor();
    this.reloadAll();
  }

  changeState(task: Task, state: TaskState): void {
    if (task.state === state) return;
    this.adminService
      .updateTaskState(task.id, state)
      .pipe(
        tap(() => {
          this.toastService.add('წარმატება', 'სტატუსი განახლდა', 2500, 'success');
          this.resources[task.state].reload();
          this.resources[state].reload();
        }),
        catchError((err) => {
          this.toastService.add('შეცდომა', err.error?.error || 'ვერ შესრულდა', 3000, 'error');
          return of(null);
        }),
      )
      .subscribe();
  }

  openDelete(taskId: number): void {
    this.taskToDelete.set(taskId);
    this.deleteOpen.set(true);
  }

  closeDelete(): void {
    this.deleteOpen.set(false);
    this.taskToDelete.set(null);
  }

  confirmDelete(): void {
    const id = this.taskToDelete();
    if (id == null) return;
    this.adminService
      .deleteTask(id)
      .pipe(
        tap(() => {
          this.toastService.add('წარმატება', 'დავალება წაიშალა', 2500, 'success');
          this.reloadAll();
        }),
        catchError((err) => {
          this.toastService.add('შეცდომა', err.error?.error || 'ვერ წაიშალა', 3000, 'error');
          return of(null);
        }),
      )
      .subscribe(() => this.closeDelete());
  }
}
