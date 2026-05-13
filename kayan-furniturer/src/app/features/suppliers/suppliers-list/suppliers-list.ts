import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClientService } from '../../../shared/services/http-client.service';

export interface Supplier {
  id: number;
  name: string;
  code: string;
  phone: string;
  contactNotes: string;
  debt: string;
  lastPaymentDate: string;
  lastPaymentAmount: string;
  status: 'active' | 'inactive';
  imageUrl: string;
  outstanding_balance: number;
  total_paid_lifetime: number;
}

export interface SupplierStats {
  total_suppliers: number;
  total_debt: number;
  containers_in_route: number;
  last_payment_amount: number;
}

@Component({
  selector: 'app-suppliers-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './suppliers-list.html',
  styleUrls: ['./suppliers-list.scss']
})
export class SuppliersList implements OnInit {
  private http = inject(HttpClientService);
  private router = inject(Router);

  isLoading = signal(true);
  error = signal<string | null>(null);
  suppliers = signal<Supplier[]>([]);
  stats = signal<SupplierStats | null>(null);

  totalDebt = computed(() => {
    if (this.stats()) {
      return this.formatCurrency(this.stats()!.total_debt);
    }
    return this.calculateTotalDebt();
  });

  containersInRoute = computed(() => {
    return this.stats()?.containers_in_route || 0;
  });

  lastPayment = computed(() => {
    if (this.stats()) {
      return this.formatCurrency(this.stats()!.last_payment_amount);
    }
    return this.findLastPayment();
  });

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get<Supplier[]>('/suppliers').subscribe({
      next: (data) => {
        this.suppliers.set(data.map(s => this.mapSupplier(s)));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load suppliers:', err);
        this.error.set('فشل في تحميل بيانات الموردين');
        this.isLoading.set(false);
      }
    });
  }

  private mapSupplier(data: any): Supplier {
    return {
      id: data.id,
      name: data.name || 'بدون اسم',
      code: `#SPL-${String(data.id).padStart(4, '0')}`,
      phone: data.phone || 'غير متوفر',
      contactNotes: data.notes || 'بدون ملاحظات',
      debt: this.formatCurrency(data.outstanding_balance || 0),
      lastPaymentDate: '---',
      lastPaymentAmount: '',
      status: data.status || 'inactive',
      imageUrl: this.generateAvatar(data.name),
      outstanding_balance: data.outstanding_balance || 0,
      total_paid_lifetime: data.total_paid_lifetime || 0
    };
  }

  private calculateTotalDebt(): string {
    const total = this.suppliers().reduce((sum, s) => sum + s.outstanding_balance, 0);
    return this.formatCurrency(total);
  }

  private findLastPayment(): string {
    const supplierWithLastPayment = this.suppliers()
      .filter(s => s.total_paid_lifetime > 0)
      .sort((a, b) => b.total_paid_lifetime - a.total_paid_lifetime)[0];

    if (supplierWithLastPayment) {
      return this.formatCurrency(supplierWithLastPayment.total_paid_lifetime);
    }
    return '٠';
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  private generateAvatar(name: string): string {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      '#e8c46a', '#ffb781', '#c5c5e1', '#ffb4ab', '#cba851'
    ];
    const color = colors[hash % colors.length];
    const initial = name.charAt(0) || '?';

    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <rect width="48" height="48" fill="${color}"/>
        <text x="24" y="30" font-size="24" font-weight="bold" fill="#3e2e00" text-anchor="middle">
          ${initial}
        </text>
      </svg>
    `)}`;
  }
}
