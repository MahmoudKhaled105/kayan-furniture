import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CustomerService, Customer } from '../../../shared/services/customer.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './customers-list.html',
  styleUrl: './customers-list.scss',
})
export class CustomersList implements OnInit {
  private customerService = inject(CustomerService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  isLoading = signal(true);
  error = signal<string | null>(null);
  customers = signal<Customer[]>([]);
  
  showAddModal = signal(false);
  customerForm: FormGroup;

  constructor() {
    this.customerForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+]+$/)]],
      notes: ['']
    });
  }

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.isLoading.set(true);
    this.error.set(null);
    this.customerService.getCustomers().subscribe({
      next: (data: Customer[]) => {
        this.customers.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load customers:', err);
        this.error.set('فشل في تحميل قائمة العملاء');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.customerForm.valid) {
      this.isLoading.set(true);
      this.customerService.createCustomer(this.customerForm.value).subscribe({
        next: () => {
          this.showAddModal.set(false);
          this.customerForm.reset();
          this.loadCustomers();
        },
        error: (err: any) => {
          console.error('Failed to create customer:', err);
          this.isLoading.set(false);
          this.toast.error('فشل في إضافة العميل', err);
        }
      });
    } else {
      this.customerForm.markAllAsTouched();
    }
  }
}
