import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { OrderService, Order } from '../../../shared/services/order.service';
import { InventoryService, ProductItem } from '../../../shared/services/inventory.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
})
export class OrderDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  isLoading = signal(true);
  order = signal<Order | null>(null);
  payments = signal<any[]>([]);
  availableItems = signal<ProductItem[]>([]);
  
  paymentForm: FormGroup;
  showPaymentModal = signal(false);
  showFulfillModal = signal(false);
  selectedItemId = signal<number | null>(null);

  constructor() {
    this.paymentForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      payment_date: [new Date().toISOString().split('T')[0], Validators.required],
      notes: ['']
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadData(parseInt(id));
    }
  }

  loadData(id: number) {
    this.isLoading.set(true);
    this.orderService.getOrder(id).subscribe({
      next: (data: any) => {
        this.order.set(data);
        this.loadPayments(id);
        if (data.is_backorder && data.status === 'backorder') {
          this.loadAvailableItems();
        }
        this.isLoading.set(false);
      },
      error: (err: any) => this.isLoading.set(false)
    });
  }

  loadPayments(id: number) {
    this.orderService.getOrderPayments(id).subscribe((p: any[]) => this.payments.set(p));
  }

  loadAvailableItems() {
    this.inventoryService.getItems({ status: 'in_storage' }).subscribe((i: any[]) => this.availableItems.set(i));
  }

  onAddPayment() {
    if (this.paymentForm.valid && this.order()) {
      this.isLoading.set(true);
      this.orderService.addPayment(this.order()!.id, this.paymentForm.value).subscribe({
        next: () => {
          this.showPaymentModal.set(false);
          this.paymentForm.reset({ payment_date: new Date().toISOString().split('T')[0] });
          this.loadData(this.order()!.id);
        },
        error: (err: any) => {
          console.error('Payment failed:', err);
          this.isLoading.set(false);
          this.toast.error('فشل في تسجيل السداد', err);
        }
      });
    }
  }

  onFulfill() {
    if (this.selectedItemId() && this.order()) {
      this.isLoading.set(true);
      this.orderService.fulfillOrder(this.order()!.id, this.selectedItemId()!).subscribe({
        next: () => {
          this.showFulfillModal.set(false);
          this.loadData(this.order()!.id);
        },
        error: (err: any) => {
          console.error('Fulfillment failed:', err);
          this.isLoading.set(false);
          this.toast.error('فشل في تسليم الطلب', err);
        }
      });
    }
  }

  onToggleDeliveryStatus() {
    if (this.order()) {
      const currentStatus = this.order()?.delivery_status || 'not_received';
      const newStatus = currentStatus === 'not_received' ? 'received' : 'not_received';
      this.isLoading.set(true);
      this.orderService.updateDeliveryStatus(this.order()!.id, newStatus).subscribe({
        next: () => {
          this.loadData(this.order()!.id);
        },
        error: (err: any) => {
          console.error('Failed to update delivery status:', err);
          this.isLoading.set(false);
          this.toast.error('فشل في تحديث حالة الاستلام', err);
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-primary/10 text-primary border-primary/20';
      case 'fulfilled': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
      case 'backorder': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
      default: return 'bg-outline-variant/10 text-outline-variant border-outline-variant/20';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'قيد التنفيذ';
      case 'fulfilled': return 'تم التسليم';
      case 'backorder': return 'حجز (نواقص)';
      default: return status;
    }
  }
}
