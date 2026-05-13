import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { OrderService } from '../../../shared/services/order.service';
import { CustomerService, Customer } from '../../../shared/services/customer.service';
import { InventoryService, ProductItem } from '../../../shared/services/inventory.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-add-order',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './add-order.html',
  styleUrl: './add-order.scss',
})
export class AddOrder implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private customerService = inject(CustomerService);
  private inventoryService = inject(InventoryService);
  private toast = inject(ToastService);

  isLoading = signal(false);
  customers = signal<Customer[]>([]);
  availableItems = signal<ProductItem[]>([]);
  locations = signal<any[]>([]);
  
  orderForm: FormGroup;
  isBackorder = signal(false);

  constructor() {
    this.orderForm = this.fb.group({
      customer_id: [null, Validators.required],
      item_id: [null],
      location_id: [null, Validators.required],
      agreed_price: [null, [Validators.required, Validators.min(0)]],
      initial_payment: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.min(0)]],
      payment_method: ['cash', Validators.required],
      is_backorder: [false],
      backorder_description: [''],
      expected_arrival: [''],
      fulfillment_trigger: ['']
    });
  }

  ngOnInit() {
    this.loadData();
    this.setupInteractions();
  }

  loadData() {
    this.customerService.getCustomers().subscribe((c: Customer[]) => this.customers.set(c));
    this.inventoryService.getLocations().subscribe((l: any[]) => this.locations.set(l));
    // Load items in storage
    this.inventoryService.getItems({ status: 'in_storage' }).subscribe((i: ProductItem[]) => this.availableItems.set(i));
  }

  setupInteractions() {
    this.orderForm.get('is_backorder')?.valueChanges.subscribe((val: boolean) => {
      this.isBackorder.set(val);
      const desc = this.orderForm.get('backorder_description');
      const item = this.orderForm.get('item_id');
      
      if (val) {
        desc?.setValidators([Validators.required]);
        item?.clearValidators();
        item?.setValue(null);
      } else {
        desc?.clearValidators();
      }
      desc?.updateValueAndValidity();
      item?.updateValueAndValidity();
    });

    this.orderForm.get('item_id')?.valueChanges.subscribe((itemId: string | null) => {
      if (itemId) {
        const item = this.availableItems().find(i => i.id === parseInt(itemId));
        if (item) {
          this.orderForm.patchValue({
            agreed_price: item.sale_price,
            location_id: item.location_id
          });
        }
      }
    });
  }

  onSubmit() {
    if (this.orderForm.valid) {
      this.isLoading.set(true);
      this.orderService.createOrder(this.orderForm.value).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/sales']);
        },
        error: (err: any) => {
          console.error('Failed to create order', err);
          this.isLoading.set(false);
          this.toast.error('فشل في تسجيل عملية البيع', err);
        }
      });
    } else {
      this.orderForm.markAllAsTouched();
    }
  }
}
