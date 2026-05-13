import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DashboardService, DashboardOverview, Transaction } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);

  isLoading = signal(true);
  error = signal<string | null>(null);

  overview = signal<DashboardOverview | null>(null);
  inflows = computed(() => {
    const data = this.overview();
    if (!data?.recent_transactions) return [];
    return data.recent_transactions.filter(t => t.direction === 'inflow');
  });
  outflows = computed(() => {
    const data = this.overview();
    if (!data?.recent_transactions) return [];
    return data.recent_transactions.filter(t => t.direction === 'outflow');
  });

  selectedDateFilter = signal<'today' | 'yesterday' | 'custom'>('today');

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading.set(true);
    this.error.set(null);

    this.dashboardService.getOverview().subscribe({
      next: (data: DashboardOverview) => {
        this.overview.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load dashboard data:', err);
        this.error.set('فشل في تحميل بيانات لوحة التحكم');
        this.isLoading.set(false);
      }
    });
  }

  setDateFilter(filter: 'today' | 'yesterday' | 'custom') {
    this.selectedDateFilter.set(filter);
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatTime(date: string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }

  navigateToSuppliers() {
    this.router.navigate(['/suppliers']);
  }

  navigateToShipments() {
    this.router.navigate(['/shipments']);
  }

  navigateToInventory() {
    this.router.navigate(['/inventory']);
  }

  navigateToSales() {
    this.router.navigate(['/sales']);
  }

  navigateToCustomers() {
    this.router.navigate(['/customers']);
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    this.router.navigate(['/login']);
  }

  getTransactionIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'sale': 'storefront',
      'payment': 'payments',
      'deposit': 'shopping_bag',
      'salary': 'group',
      'purchase': 'local_shipping',
      'utility': 'bolt',
      'rent': 'home',
      'other': 'receipt'
    };
    return iconMap[type] || 'receipt';
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
