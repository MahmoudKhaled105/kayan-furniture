import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FinanceService, FinanceDailyResponse, FinanceMonthlyResponse } from '../../../shared/services/finance.service';
import { ToastService } from '../../../shared/services/toast.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-accounts-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './accounts-dashboard.html',
  styleUrl: './accounts-dashboard.scss',
})
export class AccountsDashboard implements OnInit {
  private financeService = inject(FinanceService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  isLoading = signal(false);

  // Daily Summary Signals
  totalIn = signal<number>(0);
  totalOut = signal<number>(0);
  netProfit = signal<number>(0);
  dateFrom = signal<string>(new Date().toISOString().split('T')[0]);
  dateTo = signal<string>(new Date().toISOString().split('T')[0]);
  today = new Date();
  
  // Lists
  inflows = signal<any[]>([]);
  outflows = signal<any[]>([]);

  // Hassala Signals
  monthlyTarget = signal<number>(600000); // 600K dummy target for now
  currentAchieved = signal<number>(0);
  
  // Transaction Modal
  showTransactionModal = signal(false);
  transactionForm: FormGroup;
  
  constructor() {
    this.transactionForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      direction: ['outflow', Validators.required],
      type: ['expense', Validators.required],
      party: ['', Validators.required],
      notes: ['']
    });
  }

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
    this.financeService.getDailyFinance(this.dateFrom(), this.dateTo())
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

  setDateRange(type: 'today' | 'yesterday') {
    const today = new Date();
    if (type === 'today') {
      this.dateFrom.set(today.toISOString().split('T')[0]);
      this.dateTo.set(today.toISOString().split('T')[0]);
    } else {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      this.dateFrom.set(yesterday.toISOString().split('T')[0]);
      this.dateTo.set(yesterday.toISOString().split('T')[0]);
    }
    this.loadDailyData();
  }

  onDateChange() {
    this.loadDailyData();
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

  onAddTransaction() {
    if (this.transactionForm.valid) {
      this.isLoading.set(true);
      this.financeService.addTransaction(this.transactionForm.value).subscribe({
        next: () => {
          this.showTransactionModal.set(false);
          this.transactionForm.reset({ direction: 'outflow', type: 'expense' });
          this.loadDailyData();
        },
        error: (err: any) => {
          console.error('Failed to add transaction', err);
          this.isLoading.set(false);
          this.toast.error('فشل إضافة الحركة المالية', err);
        }
      });
    }
  }
}

