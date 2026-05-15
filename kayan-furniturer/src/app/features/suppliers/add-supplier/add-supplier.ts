import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClientService } from '../../../shared/services/http-client.service';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-add-supplier',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './add-supplier.html',
  styleUrls: ['./add-supplier.scss']
})
export class AddSupplier implements OnInit {
  private http = inject(HttpClientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  isEditMode = signal(false);
  editId = signal<number | null>(null);

  supplierForm = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(100)
    ]),
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern(/^01[0125][0-9]{8}$/)
    ]),
    address: new FormControl('', [
      Validators.maxLength(200)
    ]),
    notes: new FormControl('', [
      Validators.maxLength(500)
    ]),
    status: new FormControl<'active' | 'inactive'>('active')
  });

  get name() { return this.supplierForm.get('name'); }
  get phone() { return this.supplierForm.get('phone'); }
  get address() { return this.supplierForm.get('address'); }
  get notes() { return this.supplierForm.get('notes'); }
  get status() { return this.supplierForm.get('status'); }

  setStatus(newStatus: 'active' | 'inactive') {
    this.status?.setValue(newStatus);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId.set(Number(id));
      this.loadSupplier(Number(id));
    }
  }

  loadSupplier(id: number) {
    this.isLoading.set(true);
    this.http.get<any>(`/suppliers/${id}`).subscribe({
      next: (data) => {
        this.supplierForm.patchValue({
          name: data.name,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
          status: data.status
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load supplier:', err);
        this.error.set('فشل في تحميل بيانات المورد');
        this.isLoading.set(false);
        this.router.navigate(['/suppliers']);
      }
    });
  }

  onSubmit() {
    if (this.supplierForm.invalid) {
      this.markFormGroupTouched(this.supplierForm);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.success.set(false);

    const formData = {
      name: this.name?.value?.trim() || '',
      phone: this.phone?.value?.trim() || '',
      address: this.address?.value?.trim() || '',
      notes: this.notes?.value?.trim() || '',
      status: this.status?.value || 'active'
    };

    const request$ = this.isEditMode()
      ? this.http.patch(`/suppliers/${this.editId()}`, formData)
      : this.http.post('/suppliers', formData);

    request$.subscribe({
      next: (response: any) => {
        this.success.set(true);
        this.isLoading.set(false);

        setTimeout(() => {
          this.router.navigate(['/suppliers', response.id || this.editId()]);
        }, 1500);
      },
      error: (err) => {
        console.error('Failed to save supplier:', err);
        this.error.set('فشل في حفظ بيانات المورد. يرجى المحاولة مرة أخرى.');
        this.isLoading.set(false);
      }
    });
  }

  onCancel() {
    this.router.navigate(['/suppliers']);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.supplierForm.get(controlName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) {
      return 'هذا الحقل مطلوب';
    }

    if (errors['minlength']) {
      return `يجب أن يكون على الأقل ${errors['minlength'].requiredLength} أحرف`;
    }

    if (errors['maxlength']) {
      return `يجب أن يكون على الأكثر ${errors['maxlength'].requiredLength} أحرف`;
    }

    if (errors['pattern']) {
      return 'رقم تليفون غير صحيح';
    }

    return 'قيمة غير صالحة';
  }
}
