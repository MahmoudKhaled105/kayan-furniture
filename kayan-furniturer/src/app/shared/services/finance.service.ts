import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface FinanceDailyResponse {
  date: string;
  total_in: number;
  total_out: number;
  net: number;
  inflows: any[];
  outflows: any[];
}

export interface FinanceMonthlyResponse {
  year: number;
  month: number;
  total_in: number;
  total_out: number;
  net: number;
  revenue_by_location: any[];
  costs_by_type: any[];
  daily: any[];
}

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private http = inject(HttpClientService);

  getDailyFinance(date?: string): Observable<FinanceDailyResponse> {
    const params = date ? { date } : {};
    return this.http.get<FinanceDailyResponse>('/finance/daily', params);
  }

  getMonthlyFinance(year: number, month: number): Observable<FinanceMonthlyResponse> {
    return this.http.get<FinanceMonthlyResponse>('/finance/monthly', { year, month });
  }

  getObligations(): Observable<any> {
    return this.http.get<any>('/finance/obligations');
  }

  getTransactions(params?: any): Observable<any> {
    return this.http.get<any>('/finance/transactions', params);
  }
}
