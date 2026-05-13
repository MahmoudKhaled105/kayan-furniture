import { Component, signal, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClientService } from '../../../shared/services/http-client.service';

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  status: 'active' | 'inactive';
}

export interface SupplierSummary {
  supplier_id: number;
  name: string;
  total_shipments: number;
  total_value: number;
  amount_paid: number;
  outstanding_balance: number;
  last_shipment_date: string;
}

export interface Shipment {
  id: number;
  supplier_id: number;
  date_received: string;
  declared_value: number;
  amount_paid: number;
  remaining_balance: number;
  payment_status: string;
  partial_delivery: boolean;
}

export interface SupplierPayment {
  id: number;
  shipment_id: number;
  amount: number;
  paid_date: string;
  is_paid: boolean;
}

@Component({
  selector: 'app-supplier-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './supplier-details.html',
  styleUrls: ['./supplier-details.scss']
})
export class SupplierDetails implements OnInit {
  private http = inject(HttpClientService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isLoading = signal(true);
  error = signal<string | null>(null);

  supplierId = signal<number | null>(null);
  supplier = signal<Supplier | null>(null);
  summary = signal<SupplierSummary | null>(null);
  
  activeTab = signal<'shipments' | 'payments'>('shipments');
  shipments = signal<Shipment[]>([]);
  payments = signal<SupplierPayment[]>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.supplierId.set(parseInt(id));
      this.loadSupplierData();
    } else {
      this.router.navigate(['/suppliers']);
    }
  }

  loadSupplierData() {
    const id = this.supplierId();
    if (!id) return;

    this.isLoading.set(true);
    this.error.set(null);

    Promise.all([
      this.loadSupplier(id),
      this.loadSummary(id),
      this.loadShipments(id)
    ]).finally(() => {
      this.isLoading.set(false);
    });
  }

  loadSupplier(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<Supplier>(`/suppliers/${id}`).subscribe({
        next: (data) => {
          this.supplier.set(data);
          resolve();
        },
        error: (err) => {
          console.error('Failed to load supplier:', err);
          reject(err);
        }
      });
    });
  }

  loadSummary(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<SupplierSummary>(`/suppliers/${id}/summary`).subscribe({
        next: (data) => {
          this.summary.set(data);
          resolve();
        },
        error: (err) => {
          console.error('Failed to load summary:', err);
          reject(err);
        }
      });
    });
  }

  loadShipments(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<Shipment[]>(`/suppliers/${id}/shipments`).subscribe({
        next: (data) => {
          this.shipments.set(data);
          resolve();
        },
        error: (err) => {
          console.error('Failed to load shipments:', err);
          reject(err);
        }
      });
    });
  }

  loadPayments(id: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get<SupplierPayment[]>(`/suppliers/${id}/history`).subscribe({
      next: (data) => {
        this.payments.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load payments:', err);
        this.error.set('فشل في تحميل المدفوعات');
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: 'shipments' | 'payments') {
    this.activeTab.set(tab);
    if (tab === 'payments') {
      this.loadPayments(this.supplierId()!);
    }
  }

  navigateToShipment(id: number) {
    this.router.navigate(['/shipments', id]);
  }

  navigateBack() {
    this.router.navigate(['/suppliers']);
  }

  get paidPercentage(): number {
    const data = this.summary();
    if (!data || data.total_value === 0) return 0;
    return Math.round((data.amount_paid / data.total_value) * 100);
  }

  get lastPaymentDelay(): number {
    const lastDate = this.summary()?.last_shipment_date;
    if (!lastDate) return 0;
    const diff = Date.now() - new Date(lastDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getShipmentStatus(status: string): { text: string; class: string } {
    if (status === 'full' || status === 'complete') {
      return { text: 'وصلت للمخزن', class: 'delivered' };
    } else if (status === 'partial') {
      return { text: 'وصلت جزئياً', class: 'partial' };
    } else {
      return { text: 'في الطريق', class: 'in-transit' };
    }
  }

  retry() {
    this.loadSupplierData();
  }
}
