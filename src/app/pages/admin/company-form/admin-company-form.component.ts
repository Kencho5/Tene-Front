import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyRequest, CompanyType } from '@core/interfaces/admin/companies.interface';
import { CompaniesService } from '@core/services/admin/companies.service';
import { ToastService } from '@core/services/toast.service';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { SharedModule } from '@shared/shared.module';
import { COMPANY_TYPE_ITEMS, blankToNull, errorMessage } from '@utils/companies';

interface CompanyFormModel {
  name: string;
  identification_code: string;
  company_type: string;
  is_active: boolean;
  payment_terms_days: string;
  payment_terms: string;
  requires_confirmation: boolean;
  notes: string;
}

@Component({
  selector: 'app-admin-company-form',
  imports: [SharedModule, FormField, InputComponent, DropdownComponent],
  templateUrl: './admin-company-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompanyFormComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly companiesService = inject(CompaniesService);
  private readonly toastService = inject(ToastService);

  readonly typeItems = COMPANY_TYPE_ITEMS;
  readonly companyId = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly isEditMode = this.companyId !== null;

  readonly submitted = signal(false);
  readonly isSaving = signal(false);
  readonly isLoading = signal(this.isEditMode);

  readonly model = signal<CompanyFormModel>({
    name: '',
    identification_code: '',
    company_type: 'legal',
    is_active: true,
    payment_terms_days: '15',
    payment_terms: '',
    requires_confirmation: true,
    notes: '',
  });

  readonly companyForm = form(this.model, (path) => {
    required(path.name, { message: 'დასახელება აუცილებელია' });
    required(path.identification_code, { message: 'საიდენტიფიკაციო კოდი აუცილებელია' });
    required(path.company_type, { message: 'ტიპი აუცილებელია' });
  });

  constructor() {
    if (this.companyId !== null) {
      this.companiesService.getCompany(this.companyId).subscribe({
        next: (company) => {
          this.model.set({
            name: company.name,
            identification_code: company.identification_code,
            company_type: company.company_type,
            is_active: company.is_active,
            payment_terms_days: String(company.payment_terms_days),
            payment_terms: company.payment_terms ?? '',
            requires_confirmation: company.requires_confirmation,
            notes: company.notes ?? '',
          });
          this.isLoading.set(false);
        },
        error: () => {
          this.toastService.add('შეცდომა', 'კომპანია ვერ მოიძებნა', 4000, 'error');
          this.router.navigate(['/admin/companies']);
        },
      });
    }
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    if (this.companyForm().invalid()) {
      const first = this.companyForm().errorSummary()[0]?.message;
      this.toastService.add('შეცდომა', first || 'შეავსეთ აუცილებელი ველები', 4000, 'error');
      return;
    }

    const value = this.model();
    const days = Number(value.payment_terms_days);
    if (!Number.isInteger(days) || days < 0) {
      this.toastService.add('შეცდომა', 'გადახდის ვადა უნდა იყოს დადებითი მთელი რიცხვი', 4000, 'error');
      return;
    }

    const payload: CompanyRequest = {
      name: value.name.trim(),
      identification_code: value.identification_code.trim(),
      company_type: value.company_type as CompanyType,
      is_active: value.is_active,
      payment_terms_days: days,
      payment_terms: blankToNull(value.payment_terms),
      requires_confirmation: value.requires_confirmation,
      notes: blankToNull(value.notes),
    };

    this.isSaving.set(true);
    const request = this.companyId
      ? this.companiesService.updateCompany(this.companyId, payload)
      : this.companiesService.createCompany(payload);

    request.subscribe({
      next: (company) => {
        this.isSaving.set(false);
        this.toastService.add(
          'წარმატება',
          this.isEditMode ? 'კომპანია განახლდა' : 'კომპანია დაემატა',
          3000,
          'success',
        );
        this.router.navigate(['/admin/companies', company.id]);
      },
      error: (error) => {
        this.isSaving.set(false);
        this.toastService.add('შეცდომა', errorMessage(error, 'შენახვა ვერ მოხერხდა'), 5000, 'error');
      },
    });
  }

  cancel(): void {
    this.router.navigate(this.companyId ? ['/admin/companies', this.companyId] : ['/admin/companies']);
  }
}
