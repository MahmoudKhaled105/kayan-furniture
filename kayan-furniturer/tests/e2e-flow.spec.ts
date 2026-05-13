import { test, expect } from '@playwright/test';

test.describe('Kayan Furniture E2E Flow', () => {
  const baseUrl = 'http://localhost:4200';

  test('Complete Sales Lifecycle', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseUrl}/login`);
    await page.getByPlaceholder('01xxxxxxxxx').fill('admin@kayan.com');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: 'افتح الباب' }).click();

    // Verify login was successful
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('رصيد الخزنة الحالي')).toBeVisible();

    // 2. Add a new Supplier
    await page.getByRole('link', { name: 'local_shipping الموردين' }).click();
    await page.getByRole('link', { name: 'add + مورد جديد' }).click();
    
    await page.getByPlaceholder('مثلاً: الحاج محمود للرخام').fill('Kayan Wood');
    await page.getByPlaceholder('01x xxxx xxxx').fill('01234567890');
    await page.getByPlaceholder('المكان فين بالظبط؟').fill('Damietta, Egypt');
    await page.getByPlaceholder('أي تفاصيل زيادة عن المورد ده.. بضاعته عاملة إزاي؟ مواعيده دقيقة؟').fill('Premium wood supplier');
    
    const saveSupplierBtn = page.getByRole('button', { name: 'حفظ المورد' });
    await expect(saveSupplierBtn).toBeEnabled();
    await saveSupplierBtn.click();
    
    // Verify redirection back to suppliers list
    await expect(page).toHaveURL(/.*suppliers/);
    await expect(page.getByText('Kayan Wood')).toBeVisible();

    // 3. Add a new Product
    await page.getByRole('link', { name: 'inventory_2 الجرد' }).click();
    await page.getByRole('button', { name: 'إضافة قطعة جديدة' }).click();
    
    await page.getByPlaceholder('مثلاً: انتريه كابتونيه مودرن').fill('Oak Table');
    await page.getByPlaceholder('مثلاً: غرف معيشة').fill('Dining Rooms');
    
    // Select Location using selectOption for stability
    await page.locator('select[formControlName="location_id"]').selectOption({ label: 'معرض اباهيم سلامة' });
    
    // Select Supplier (Shipment)
    await page.locator('select[formControlName="shipment_id"]').selectOption({ label: 'الحاج علاء - بدون رقم' });
    
    // Fill cost and sale price using more robust selectors
    await page.locator('input[formControlName="purchase_value"]').fill('5000');
    await page.locator('input[formControlName="sale_price"]').fill('7500');
    
    const saveProductBtn = page.getByRole('button', { name: 'حفظ وتأجيل الجرد' });
    await expect(saveProductBtn).toBeEnabled();
    await saveProductBtn.click();
    
    // Verify back to inventory
    await expect(page).toHaveURL(/.*inventory/);
    await expect(page.getByText('Oak Table'), { timeout: 10000 }).toBeVisible();

    // 4. Add a new Customer
    await page.getByRole('link', { name: 'person العملاء' }).click();
    await page.getByRole('button', { name: 'إضافة عميل جديد' }).click();
    
    await page.getByPlaceholder('مثلاً: محمد أحمد علي').fill('Test Customer');
    await page.getByPlaceholder('01xxxxxxxxx').fill('01112223334');
    await page.getByPlaceholder(/مثلاً: عميل دائم/).fill('E2E Test Customer');
    
    await page.getByRole('button', { name: 'تأكيد الإضافة والقيد بالدفاتر' }).click();
    
    // Verify customer added
    await expect(page.getByText('Test Customer'), { timeout: 10000 }).toBeVisible();

    // 5. Create a new Sale
    await page.getByRole('link', { name: 'sell المبيعات' }).click();
    await page.getByRole('button', { name: 'تسجيل بيع جديد' }).click();
    
    // Select Customer
    await page.locator('select[formControlName="customer_id"]').selectOption({ label: 'Test Customer (01112223334)' });
    
    // Select Product
    await page.locator('select[formControlName="item_id"]').selectOption({ label: 'Oak Table - (معرض اباهيم سلامة) - 7,500 ج.م' });
    
    // Select Sale Location
    await page.locator('select[formControlName="location_id"]').selectOption({ label: 'معرض اباهيم سلامة' });
    
    // Set Sale price and payment
    await page.locator('input[formControlName="agreed_price"]').fill('7000');
    await page.locator('input[formControlName="initial_payment"]').fill('1000');
    
    const saveSaleBtn = page.getByRole('button', { name: 'تسجيل البيع نهائياً' });
    await expect(saveSaleBtn).toBeEnabled();
    await saveSaleBtn.click();
    
    // 6. Verify Sale in list
    await expect(page).toHaveURL(/.*sales/);
    await expect(page.getByText('Test Customer')).toBeVisible();
    await expect(page.getByText('7,000')).toBeVisible();
  });
});
