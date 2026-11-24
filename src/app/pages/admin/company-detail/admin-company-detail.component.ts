import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, required } from '@angular/forms/signals';
import { ActivatedRoute, Params, Router } from '@angular/router';
import {
  CompanyAddress,
  CompanyContact,
  CompanyContract,
  WasteType,
} from '@core/interfaces/admin/companies.interface';
import { CompaniesService } from '@core/services/admin/companies.service';
import { ToastService } from '@core/services/toast.service';
import { AdminDialogComponent } from '@shared/components/admin/admin-dialog/admin-dialog.component';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { SharedModule } from '@shared/shared.module';
import { Observable, of, switchMap } from 'rxjs';
import {
  ACTIVITY_BADGE,
  ACTIVITY_LABELS,
  BADGE_NEUTRAL,
  COMPANY_TYPE_LABELS,
  CONTRACT_BADGE,
  CONTRACT_STATUS_LABELS,
  EXPIRY_WARNING_DAYS,
  INVOICE_BADGE,
  INVOICE_STATUS_LABELS,
  PICKUP_BADGE,
  PICKUP_STATUS_LABELS,
  WASTE_TYPE_ITEMS,
  WASTE_TYPE_LABELS,
  blankToNull,
  errorMessage,
  formatDate,
  formatDateTime,
  formatKg,
  formatMoney,
  todayInput,
} from '@utils/companies';

type Tab = 'info' | 'contracts' | 'tariffs' | 'pickups' | 'invoices';
type ConfirmKind = 'company' | 'address' | 'contact' | 'contract' | 'contract-file' | 'tariff';

interface ConfirmState {
  kind: ConfirmKind;
  id: number;
  title: string;
  message: string;
}

const CONTRACT_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Component({
  selector: 'app-admin-company-detail',
  imports: [SharedModule, FormField, AdminDialogComponent, DropdownComponent],
  templateUrl: './admin-company-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompanyDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly companiesService = inject(CompaniesService);
  private readonly toastService = inject(ToastService);

  readonly companyId = Number(this.route.snapshot.paramMap.get('id'));

  readonly activityBadge = ACTIVITY_BADGE;
  readonly activityLabels = ACTIVITY_LABELS;
  readonly typeLabels = COMPANY_TYPE_LABELS;
  readonly contractBadge = CONTRACT_BADGE;
  readonly contractLabels = CONTRACT_STATUS_LABELS;
  readonly pickupBadge = PICKUP_BADGE;
  readonly pickupLabels = PICKUP_STATUS_LABELS;
  readonly invoiceBadge = INVOICE_BADGE;
  readonly invoiceLabels = INVOICE_STATUS_LABELS;
  readonly wasteLabels = WASTE_TYPE_LABELS;
  readonly wasteItems = WASTE_TYPE_ITEMS;
  readonly neutralBadge = BADGE_NEUTRAL;
  readonly expiryWarningDays = EXPIRY_WARNING_DAYS;
  readonly contractFileAccept = CONTRACT_FILE_TYPES.join(',');
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly formatMoney = formatMoney;
  readonly formatKg = formatKg;

  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: 'ინფორმაცია' },
    { id: 'contracts', label: 'ხელშეკრულებები' },
    { id: 'tariffs', label: 'ტარიფები' },
    { id: 'pickups', label: 'გატანები' },
    { id: 'invoices', label: 'ინვოისები' },
  ];

  private readonly queryParams = toSignal(this.route.queryParams, { initialValue: {} as Params });
  readonly activeTab = computed<Tab>(() => {
    const tab = this.queryParams()['tab'];
    return this.tabs.some((t) => t.id === tab) ? (tab as Tab) : 'info';
  });

  readonly companyResource = rxResource({
    stream: () => this.companiesService.getCompany(this.companyId),
  });
  readonly company = computed(() => this.companyResource.value());

  readonly pickupsResource = rxResource({
    params: () => (this.activeTab() === 'pickups' ? { company_id: this.companyId, limit: 20 } : undefined),
    stream: ({ params }) => this.companiesService.listPickups(params),
  });

  readonly invoicesResource = rxResource({
    params: () => (this.activeTab() === 'invoices' ? { company_id: this.companyId, limit: 20 } : undefined),
    stream: ({ params }) => this.companiesService.listInvoices(params),
  });

  readonly invoiceRecipients = computed(
    () => this.company()?.contacts.filter((c) => c.receives_invoices && c.email) ?? [],
  );

  readonly missingTariffs = computed(() => {
    const current = new Set(this.company()?.current_tariffs.map((t) => t.waste_type) ?? []);
    return this.wasteItems.filter((w) => !current.has(w.value as WasteType));
  });

  readonly isSaving = signal(false);
  readonly confirmState = signal<ConfirmState | null>(null);

  readonly addressDialog = signal<{ id?: number } | null>(null);
  readonly addressModel = signal({ label: '', city: '', address: '' });
  readonly addressForm = form(this.addressModel, (path) => {
    required(path.address, { message: 'მისამართი აუცილებელია' });
  });

  readonly contactDialog = signal<{ id?: number } | null>(null);
  readonly contactModel = signal({ full_name: '', phone: '', email: '', receives_invoices: false });
  readonly contactForm = form(this.contactModel, (path) => {
    required(path.full_name, { message: 'სახელი და გვარი აუცილებელია' });
  });

  readonly contractDialog = signal<{ id?: number } | null>(null);
  readonly contractModel = signal({ contract_number: '', start_date: '', end_date: '', terms: '' });
  readonly contractForm = form(this.contractModel, (path) => {
    required(path.start_date, { message: 'დაწყების თარიღი აუცილებელია' });
    required(path.end_date, { message: 'დასრულების თარიღი აუცილებელია' });
  });
  readonly contractFile = signal<File | null>(null);

  readonly tariffDialogOpen = signal(false);
  readonly tariffModel = signal({
    waste_type: 'plastic',
    price_per_kg: '',
    fixed_fee: '0',
    effective_from: '',
    note: '',
  });
  readonly tariffForm = form(this.tariffModel, (path) => {
    required(path.waste_type, { message: 'ნარჩენის ტიპი აუცილებელია' });
    required(path.price_per_kg, { message: 'ფასი აუცილებელია' });
    required(path.effective_from, { message: 'თარიღი აუცილებელია' });
  });

  setTab(tab: Tab): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'info' ? undefined : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private fail(error: unknown, fallback: string): void {
    this.isSaving.set(false);
    this.toastService.add('შეცდომა', errorMessage(error, fallback), 5000, 'error');
  }

  private succeed(message: string): void {
    this.isSaving.set(false);
    this.toastService.add('წარმატება', message, 3000, 'success');
    this.companyResource.reload();
  }

  private firstError(fieldTree: { (): { errorSummary(): { message?: string }[] } }): string {
    return fieldTree().errorSummary()[0]?.message || 'შეავსეთ აუცილებელი ველები';
  }

  openAddress(address?: CompanyAddress): void {
    this.addressModel.set({
      label: address?.label ?? '',
      city: address?.city ?? '',
      address: address?.address ?? '',
    });
    this.addressDialog.set({ id: address?.id });
  }

  saveAddress(): void {
    const dialog = this.addressDialog();
    if (!dialog || this.isSaving()) return;
    if (this.addressForm().invalid()) {
      this.toastService.add('შეცდომა', this.firstError(this.addressForm), 4000, 'error');
      return;
    }
    const value = this.addressModel();
    this.isSaving.set(true);
    this.companiesService
      .saveAddress(
        this.companyId,
        { label: blankToNull(value.label), city: blankToNull(value.city), address: value.address.trim() },
        dialog.id,
      )
      .subscribe({
        next: () => {
          this.addressDialog.set(null);
          this.succeed(dialog.id ? 'მისამართი განახლდა' : 'მისამართი დაემატა');
        },
        error: (e) => this.fail(e, 'მისამართის შენახვა ვერ მოხერხდა'),
      });
  }

  openContact(contact?: CompanyContact): void {
    this.contactModel.set({
      full_name: contact?.full_name ?? '',
      phone: contact?.phone ?? '',
      email: contact?.email ?? '',
      receives_invoices: contact?.receives_invoices ?? false,
    });
    this.contactDialog.set({ id: contact?.id });
  }

  saveContact(): void {
    const dialog = this.contactDialog();
    if (!dialog || this.isSaving()) return;
    if (this.contactForm().invalid()) {
      this.toastService.add('შეცდომა', this.firstError(this.contactForm), 4000, 'error');
      return;
    }
    const value = this.contactModel();
    if (value.receives_invoices && !value.email.trim()) {
      this.toastService.add('შეცდომა', 'ინვოისის მიმღებისთვის ელფოსტა აუცილებელია', 4000, 'error');
      return;
    }
    this.isSaving.set(true);
    this.companiesService
      .saveContact(
        this.companyId,
        {
          full_name: value.full_name.trim(),
          phone: blankToNull(value.phone),
          email: blankToNull(value.email),
          receives_invoices: value.receives_invoices,
        },
        dialog.id,
      )
      .subscribe({
        next: () => {
          this.contactDialog.set(null);
          this.succeed(dialog.id ? 'საკონტაქტო პირი განახლდა' : 'საკონტაქტო პირი დაემატა');
        },
        error: (e) => this.fail(e, 'საკონტაქტო პირის შენახვა ვერ მოხერხდა'),
      });
  }

  toggleInvoiceRecipient(contact: CompanyContact): void {
    if (!contact.email) {
      this.openContact(contact);
      return;
    }
    this.companiesService
      .saveContact(
        this.companyId,
        {
          full_name: contact.full_name,
          phone: contact.phone,
          email: contact.email,
          receives_invoices: !contact.receives_invoices,
        },
        contact.id,
      )
      .subscribe({
        next: () => this.companyResource.reload(),
        error: (e) => this.fail(e, 'ცვლილება ვერ შეინახა'),
      });
  }

  openContract(contract?: CompanyContract): void {
    const today = todayInput();
    this.contractModel.set({
      contract_number: contract?.contract_number ?? '',
      start_date: contract?.start_date ?? today,
      end_date: contract?.end_date ?? '',
      terms: contract?.terms ?? '',
    });
    this.contractFile.set(null);
    this.contractDialog.set({ id: contract?.id });
  }

  onContractFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !CONTRACT_FILE_TYPES.includes(file.type)) {
      this.toastService.add('შეცდომა', 'დასაშვებია PDF, Word ან სურათის ფაილი', 4000, 'error');
      input.value = '';
      return;
    }
    this.contractFile.set(file);
  }

  saveContract(): void {
    const dialog = this.contractDialog();
    if (!dialog || this.isSaving()) return;
    if (this.contractForm().invalid()) {
      this.toastService.add('შეცდომა', this.firstError(this.contractForm), 4000, 'error');
      return;
    }
    const value = this.contractModel();
    if (value.end_date < value.start_date) {
      this.toastService.add('შეცდომა', 'დასრულების თარიღი დაწყებაზე ადრეა', 4000, 'error');
      return;
    }
    const file = this.contractFile();
    this.isSaving.set(true);
    this.companiesService
      .saveContract(
        this.companyId,
        {
          contract_number: blankToNull(value.contract_number),
          start_date: value.start_date,
          end_date: value.end_date,
          terms: blankToNull(value.terms),
        },
        dialog.id,
      )
      .pipe(
        switchMap((contract): Observable<unknown> =>
          file ? this.companiesService.uploadContractFile(this.companyId, contract.id, file) : of(null),
        ),
      )
      .subscribe({
        next: () => {
          this.contractDialog.set(null);
          this.succeed(dialog.id ? 'ხელშეკრულება განახლდა' : 'ხელშეკრულება დაემატა');
        },
        error: (e) => {
          this.companyResource.reload();
          this.fail(e, 'ხელშეკრულების ან ფაილის შენახვა ვერ მოხერხდა');
        },
      });
  }

  openTariff(wasteType?: string): void {
    this.tariffModel.set({
      waste_type: wasteType ?? 'plastic',
      price_per_kg: '',
      fixed_fee: '0',
      effective_from: todayInput(),
      note: '',
    });
    this.tariffDialogOpen.set(true);
  }

  saveTariff(): void {
    if (this.isSaving()) return;
    if (this.tariffForm().invalid()) {
      this.toastService.add('შეცდომა', this.firstError(this.tariffForm), 4000, 'error');
      return;
    }
    const value = this.tariffModel();
    const price = Number(value.price_per_kg);
    const fee = Number(value.fixed_fee || 0);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(fee) || fee < 0) {
      this.toastService.add('შეცდომა', 'ფასი უნდა იყოს დადებითი რიცხვი', 4000, 'error');
      return;
    }
    this.isSaving.set(true);
    this.companiesService
      .createTariff(this.companyId, {
        waste_type: value.waste_type as WasteType,
        price_per_kg: price,
        fixed_fee: fee,
        effective_from: value.effective_from,
        note: blankToNull(value.note),
      })
      .subscribe({
        next: () => {
          this.tariffDialogOpen.set(false);
          this.succeed('ტარიფი დაემატა');
        },
        error: (e) => this.fail(e, 'ტარიფის შენახვა ვერ მოხერხდა'),
      });
  }

  askConfirm(kind: ConfirmKind, id: number, title: string, message: string): void {
    this.confirmState.set({ kind, id, title, message });
  }

  runConfirm(): void {
    const state = this.confirmState();
    if (!state || this.isSaving()) return;
    const id = this.companyId;
    const requests: Record<ConfirmKind, () => Observable<void>> = {
      company: () => this.companiesService.deleteCompany(id),
      address: () => this.companiesService.deleteAddress(id, state.id),
      contact: () => this.companiesService.deleteContact(id, state.id),
      contract: () => this.companiesService.deleteContract(id, state.id),
      'contract-file': () => this.companiesService.deleteContractFile(id, state.id),
      tariff: () => this.companiesService.deleteTariff(id, state.id),
    };
    this.isSaving.set(true);
    requests[state.kind]().subscribe({
      next: () => {
        this.confirmState.set(null);
        if (state.kind === 'company') {
          this.isSaving.set(false);
          this.toastService.add('წარმატება', 'კომპანია წაიშალა', 3000, 'success');
          this.router.navigate(['/admin/companies']);
          return;
        }
        this.succeed('წაიშალა');
      },
      error: (e) => {
        this.confirmState.set(null);
        this.fail(e, 'წაშლა ვერ მოხერხდა');
      },
    });
  }
}
