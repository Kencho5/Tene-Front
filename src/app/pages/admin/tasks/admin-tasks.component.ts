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

  readonly priorityFilter = signal<TaskPriority | undefined>(undefined);

  readonly collapsed = signal<Record<TaskState, boolean>>({
    todo: false,
    in_progress: false,
    review: false,
    done: false,
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

  readonly tasksResource = rxResource({
    defaultValue: { tasks: [], total: 0, limit: 100, offset: 0 } as TaskListResponse,
    params: () => ({ priority: this.priorityFilter() }),
    stream: ({ params }) => this.adminService.listTasks({ ...params, limit: 100 }),
  });

  readonly tasksByState = computed(() => {
    const grouped: Record<TaskState, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const task of this.tasksResource.value().tasks) {
      grouped[task.state].push(task);
    }
    return grouped;
  });

  readonly total = computed(() => this.tasksResource.value().total);

  onPriorityChange(value: string | undefined): void {
    this.priorityFilter.set(!value || value === 'all' ? undefined : (value as TaskPriority));
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

  onSaved(): void {
    this.closeEditor();
    this.tasksResource.reload();
  }

  changeState(task: Task, state: TaskState): void {
    if (task.state === state) return;
    this.adminService
      .updateTaskState(task.id, state)
      .pipe(
        tap(() => {
          this.toastService.add('წარმატება', 'სტატუსი განახლდა', 2500, 'success');
          this.tasksResource.reload();
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
          this.tasksResource.reload();
        }),
        catchError((err) => {
          this.toastService.add('შეცდომა', err.error?.error || 'ვერ წაიშალა', 3000, 'error');
          return of(null);
        }),
      )
      .subscribe(() => this.closeDelete());
  }
}
