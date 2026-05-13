import { Injectable } from '@angular/core';
import { HttpClientService } from '../../shared/services/http-client.service';
import { Observable } from 'rxjs';

export interface DashboardOverview {
  total_in: number;
  total_out: number;
  net_profit: number;
  recent_transactions: Transaction[];
}

export interface Transaction {
  id: number;
  type: string;
  direction: 'inflow' | 'outflow';
  amount: number;
  transaction_date: string;
  notes?: string;
  location_name?: string;
}

export interface ExpenseCategory {
  category: string;
  total: number;
}

export interface DashboardStats {
  current_month_inflow: number;
  monthly_target: number;
  category_distribution: { type: string; total: number }[];
}

export interface DashboardExpenses {
  period: { from: string; to: string };
  categories: ExpenseCategory[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private http: HttpClientService) {}

  getOverview(): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>('/dashboard/overview');
  }

  getExpenses(dateFrom?: string, dateTo?: string): Observable<DashboardExpenses> {
    const params: Record<string, string> = {};
    if (dateFrom) params['date_from'] = dateFrom;
    if (dateTo) params['date_to'] = dateTo;
    return this.http.get<DashboardExpenses>(`/dashboard/expenses?${new URLSearchParams(params).toString()}`);
  }

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>('/dashboard/stats');
  }
}
