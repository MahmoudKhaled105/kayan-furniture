import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService, FinanceDailyResponse, FinanceMonthlyResponse } from '../../../shared/services/finance.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-accounts-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accounts-dashboard.html',
  styleUrl: './accounts-dashboard.scss',
})
export class AccountsDashboard implements OnInit {
  private financeService = inject(FinanceService);

  isLoading = signal(false);

  // Daily Summary Signals
  totalIn = signal<number>(0);
  totalOut = signal<number>(0);
  netProfit = signal<number>(0);

  // Lists
  inflows = signal<any[]>([]);
  outflows = signal<any[]>([]);

  // Hassala Signals
  monthlyTarget = signal<number>(600000); // 600K dummy target for now
  currentAchieved = signal<number>(0);
  
  // Computed (Signal equivalent using a getter method or computed, but simple method here works fine with UI bindings)
  targetPercentage() {
    if (this.monthlyTarget() === 0) return 0;
    const perc = (this.currentAchieved() / this.monthlyTarget()) * 100;
    return Math.min(Math.round(perc), 100); // Cap at 100% for the visual ring
  }

  ngOnInit() {
    this.loadDailyData();
    this.loadMonthlyData();
  }

  loadDailyData() {
    this.isLoading.set(true);
    this.financeService.getDailyFinance()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res: FinanceDailyResponse) => {
          this.totalIn.set(res.total_in);
          this.totalOut.set(res.total_out);
          this.netProfit.set(res.net);
          this.inflows.set(res.inflows || []);
          this.outflows.set(res.outflows || []);
        },
        error: (err: any) => console.error('Failed to load daily finance data', err)
      });
  }

  loadMonthlyData() {
    const today = new Date();
    this.financeService.getMonthlyFinance(today.getFullYear(), today.getMonth() + 1)
      .subscribe({
        next: (res: FinanceMonthlyResponse) => {
          this.currentAchieved.set(res.total_in);
        },
        error: (err: any) => console.error('Failed to load monthly finance data', err)
      });
  }

  // Map transaction type to an icon for the UI
  getIconForType(type: string): string {
    const icons: Record<string, string> = {
      'customer': 'storefront',
      'supplier': 'local_shipping',
      'payroll': 'group',
      'transport': 'directions_car',
      'expense': 'bolt',
    };
    return icons[type] || 'payments';
  }

  // Format type to arabic labels for description
  getArabicTypeLabel(type: string, sourceId: number): string {
    const labels: Record<string, string> = {
      'customer': 'مبيعات / عميل',
      'supplier': 'مورد / شحنة',
      'payroll': 'مصاريف عمالة',
      'transport': 'نقل',
      'expense': 'مصروف عام',
    };
    const prefix = labels[type] || 'معاملة';
    return `${prefix} (رقم المرجع: ${sourceId || 'غير محدد'})`;
  }
}

