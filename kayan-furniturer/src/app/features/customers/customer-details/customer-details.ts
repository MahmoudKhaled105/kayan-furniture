import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CustomerService, Customer, CustomerOrder } from '../../../shared/services/customer.service';

@Component({
  selector: 'app-customer-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './customer-details.html',
  styleUrl: './customer-details.scss',
})
export class CustomerDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private customerService = inject(CustomerService);

  isLoading = signal(true);
  customer = signal<Customer | null>(null);
  orders = signal<CustomerOrder[]>([]);
  payments = signal<any[]>([]);
  
  activeTab = signal<'orders' | 'payments'>('orders');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadData(parseInt(id));
    }
  }

  loadData(id: number) {
    this.isLoading.set(true);
    this.customerService.getCustomer(id).subscribe((c: Customer) => this.customer.set(c));
    this.customerService.getCustomerOrders(id).subscribe((o: CustomerOrder[]) => this.orders.set(o));
    this.customerService.getCustomerPayments(id).subscribe((p: any[]) => {
      this.payments.set(p);
      this.isLoading.set(false);
    });
  }

  setTab(tab: 'orders' | 'payments') {
    this.activeTab.set(tab);
  }

  getRemainingTotal(): number {
    return this.orders().reduce((acc, o) => acc + o.remaining_balance, 0);
  }
}
