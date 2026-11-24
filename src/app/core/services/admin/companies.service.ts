import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import {
  CompanyAddress,
  CompanyAddressRequest,
  CompanyContact,
  CompanyContactRequest,
  CompanyContract,
  CompanyContractRequest,
  CompanyDetail,
  CompanyExportParams,
  CompanyInvoice,
  CompanyInvoiceDetail,
  CompanyListParams,
  CompanyReport,
  CompanyReportParams,
  CompanyRequest,
  CompanySearchResponse,
  CompanyTariffRequest,
  ContractListParams,
  InvoiceDelivery,
  InvoiceListParams,
  InvoiceSearchResponse,
  PickupConfirmResponse,
  PickupListParams,
  PickupRequest,
  PickupSearchResponse,
} from '@core/interfaces/admin/companies.interface';

function toParams(params: object): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  }
  return httpParams;
}

@Injectable({
  providedIn: 'root',
})
export class CompaniesService {
  private readonly http = inject(HttpClient);

  listCompanies(params: CompanyListParams = {}): Observable<CompanySearchResponse> {
    return this.http.get<CompanySearchResponse>('/admin/companies', { params: toParams(params) });
  }

  getCompany(id: number): Observable<CompanyDetail> {
    return this.http.get<CompanyDetail>(`/admin/companies/${id}`);
  }

  createCompany(payload: CompanyRequest): Observable<CompanyDetail> {
    return this.http.post<CompanyDetail>('/admin/companies', payload);
  }

  updateCompany(id: number, payload: CompanyRequest): Observable<CompanyDetail> {
    return this.http.put<CompanyDetail>(`/admin/companies/${id}`, payload);
  }

  deleteCompany(id: number): Observable<void> {
    return this.http.delete<void>(`/admin/companies/${id}`);
  }

  saveAddress(
    companyId: number,
    payload: CompanyAddressRequest,
    addressId?: number,
  ): Observable<CompanyAddress> {
    return addressId
      ? this.http.put<CompanyAddress>(`/admin/companies/${companyId}/addresses/${addressId}`, payload)
      : this.http.post<CompanyAddress>(`/admin/companies/${companyId}/addresses`, payload);
  }

  deleteAddress(companyId: number, addressId: number): Observable<void> {
    return this.http.delete<void>(`/admin/companies/${companyId}/addresses/${addressId}`);
  }

  saveContact(
    companyId: number,
    payload: CompanyContactRequest,
    contactId?: number,
  ): Observable<CompanyContact> {
    return contactId
      ? this.http.put<CompanyContact>(`/admin/companies/${companyId}/contacts/${contactId}`, payload)
      : this.http.post<CompanyContact>(`/admin/companies/${companyId}/contacts`, payload);
  }

  deleteContact(companyId: number, contactId: number): Observable<void> {
    return this.http.delete<void>(`/admin/companies/${companyId}/contacts/${contactId}`);
  }

  listContracts(params: ContractListParams = {}): Observable<CompanyContract[]> {
    return this.http.get<CompanyContract[]>('/admin/contracts', { params: toParams(params) });
  }

  saveContract(
    companyId: number,
    payload: CompanyContractRequest,
    contractId?: number,
  ): Observable<CompanyContract> {
    return contractId
      ? this.http.put<CompanyContract>(
          `/admin/companies/${companyId}/contracts/${contractId}`,
          payload,
        )
      : this.http.post<CompanyContract>(`/admin/companies/${companyId}/contracts`, payload);
  }

  deleteContract(companyId: number, contractId: number): Observable<void> {
    return this.http.delete<void>(`/admin/companies/${companyId}/contracts/${contractId}`);
  }

  uploadContractFile(companyId: number, contractId: number, file: File): Observable<unknown> {
    return this.http
      .put<{ upload_url: string }>(`/admin/companies/${companyId}/contracts/${contractId}/file`, {
        content_type: file.type,
        file_name: file.name,
      })
      .pipe(
        switchMap(({ upload_url }) =>
          this.http.put(upload_url, file, {
            headers: {
              'Content-Type': file.type,
              'Cache-Control': 'private, max-age=0',
            },
          }),
        ),
      );
  }

  deleteContractFile(companyId: number, contractId: number): Observable<void> {
    return this.http.delete<void>(`/admin/companies/${companyId}/contracts/${contractId}/file`);
  }

  createTariff(companyId: number, payload: CompanyTariffRequest): Observable<CompanyDetail> {
    return this.http.post<CompanyDetail>(`/admin/companies/${companyId}/tariffs`, payload);
  }

  deleteTariff(companyId: number, tariffId: number): Observable<void> {
    return this.http.delete<void>(`/admin/companies/${companyId}/tariffs/${tariffId}`);
  }

  listPickups(params: PickupListParams = {}): Observable<PickupSearchResponse> {
    return this.http.get<PickupSearchResponse>('/admin/pickups', { params: toParams(params) });
  }

  savePickup(payload: PickupRequest, pickupId?: number): Observable<PickupConfirmResponse> {
    return pickupId
      ? this.http.put<PickupConfirmResponse>(`/admin/pickups/${pickupId}`, payload)
      : this.http.post<PickupConfirmResponse>('/admin/pickups', payload);
  }

  deletePickup(id: number): Observable<void> {
    return this.http.delete<void>(`/admin/pickups/${id}`);
  }

  confirmPickup(id: number): Observable<PickupConfirmResponse> {
    return this.http.post<PickupConfirmResponse>(`/admin/pickups/${id}/confirm`, {});
  }

  listInvoices(params: InvoiceListParams = {}): Observable<InvoiceSearchResponse> {
    return this.http.get<InvoiceSearchResponse>('/admin/invoices', { params: toParams(params) });
  }

  getInvoice(id: number): Observable<CompanyInvoiceDetail> {
    return this.http.get<CompanyInvoiceDetail>(`/admin/invoices/${id}`);
  }

  sendInvoice(id: number): Observable<InvoiceDelivery> {
    return this.http.post<InvoiceDelivery>(`/admin/invoices/${id}/send`, {});
  }

  setInvoicePaid(id: number, paid: boolean): Observable<CompanyInvoice> {
    return this.http.patch<CompanyInvoice>(`/admin/invoices/${id}/payment`, { paid });
  }

  getReport(params: CompanyReportParams = {}): Observable<CompanyReport> {
    return this.http.get<CompanyReport>('/admin/companies/report', { params: toParams(params) });
  }

  exportExcel(params: CompanyExportParams = {}): Observable<Blob> {
    return this.http.get('/admin/companies/export', {
      params: toParams(params),
      responseType: 'blob',
    });
  }
}
