import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { Location } from '@angular/common';
import { SharedModule } from '@shared/shared.module';

export interface BreadcrumbItem {
  label: string;
  route?: string;
  queryParams?: Record<string, any>;
}

@Component({
  selector: 'app-breadcrumb',
  imports: [SharedModule],
  templateUrl: './breadcrumb.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  private readonly location = inject(Location);

  readonly items = input.required<BreadcrumbItem[]>();
  readonly showBackButton = input<boolean>(true);

  navigateBack(): void {
    this.location.back();
  }
}
