# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e-flow.spec.ts >> Kayan Furniture E2E Flow >> Complete Sales Lifecycle
- Location: tests\e2e-flow.spec.ts:6:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('select[formControlName="item_id"]')
    - locator resolved to <select formcontrolname="item_id" class="w-full bg-surface-container-lowest border-none rounded-2xl px-6 py-5 text-on-surface focus:ring-1 focus:ring-primary/40 outline-none appearance-none cursor-pointer ng-untouched ng-pristine ng-valid">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    102 × waiting for element to be visible and enabled
        - did not find some options
      - retrying select option action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e7]: chair
      - generic [ref=e8]:
        - heading "المندرة" [level=2] [ref=e9]
        - paragraph [ref=e10]: إدارة الحسابات الفاخرة
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: account_balance_wallet
        - generic [ref=e14]: رصيد الخزنة الحالي
      - generic [ref=e15]: ٤٥٠,٢٣٠ ج.م
    - generic [ref=e16]:
      - link "dashboard الزتونة" [ref=e17] [cursor=pointer]:
        - /url: /dashboard
        - generic [ref=e18]: dashboard
        - generic [ref=e19]: الزتونة
      - link "local_shipping الموردين" [ref=e20] [cursor=pointer]:
        - /url: /suppliers
        - generic [ref=e21]: local_shipping
        - generic [ref=e22]: الموردين
      - link "inventory_2 الجرد" [ref=e23] [cursor=pointer]:
        - /url: /inventory
        - generic [ref=e24]: inventory_2
        - generic [ref=e25]: الجرد
      - link "sell المبيعات" [ref=e26] [cursor=pointer]:
        - /url: /sales
        - generic [ref=e27]: sell
        - generic [ref=e28]: المبيعات
      - link "person العملاء" [ref=e29] [cursor=pointer]:
        - /url: /customers
        - generic [ref=e30]: person
        - generic [ref=e31]: العملاء
      - generic [ref=e32] [cursor=pointer]:
        - generic [ref=e33]: account_balance
        - generic [ref=e34]: الحسابات
    - generic [ref=e35]:
      - button "add_circle إضافة حركة مالية" [ref=e36] [cursor=pointer]:
        - generic [ref=e37]: add_circle
        - generic [ref=e38]: إضافة حركة مالية
      - generic [ref=e40] [cursor=pointer]:
        - generic [ref=e41]: settings
        - generic [ref=e42]: الإعدادات
      - generic [ref=e43] [cursor=pointer]:
        - generic [ref=e44]: logout
        - generic [ref=e45]: تسجيل خروج
  - main [ref=e46]:
    - generic [ref=e47]:
      - generic [ref=e48]:
        - heading "كُشك" [level=1] [ref=e49]
        - generic [ref=e50]:
          - link "الزتونة" [ref=e51] [cursor=pointer]:
            - /url: /dashboard
          - link "الموردين" [ref=e52] [cursor=pointer]:
            - /url: /suppliers
          - link "الجرد" [ref=e53] [cursor=pointer]:
            - /url: /inventory
          - link "المبيعات" [ref=e54] [cursor=pointer]:
            - /url: /sales
      - generic [ref=e55]:
        - generic [ref=e56]:
          - generic [ref=e57]: calendar_today
          - generic [ref=e58]: ٨ أبريل ٢٠٢٦
        - generic [ref=e59] [cursor=pointer]: account_balance_wallet
        - generic [ref=e60] [cursor=pointer]: notifications
    - generic [ref=e64]:
      - generic [ref=e66]:
        - generic [ref=e68]: عملية بيع
        - heading "تحرير فاتورة بيع جديدة" [level=2] [ref=e69]
        - paragraph [ref=e70]: تسجيل بيانات العميل، اختيار القطعة، وتحديد شروط السداد
      - generic [ref=e71]:
        - generic [ref=e72]:
          - generic [ref=e73]:
            - generic [ref=e74]:
              - generic [ref=e75]: person_search
              - heading "بيانات العميل" [level=3] [ref=e76]
            - generic [ref=e77]:
              - text: اختيار العميل
              - combobox [ref=e78] [cursor=pointer]:
                - option "ابحث عن عميل موجود..."
                - option "omar fawzy (01200336033)"
                - option "Test Customer (01112223334)" [selected]
              - paragraph [ref=e79] [cursor=pointer]: غير موجود؟ أضف عميل جديد أولاً
          - generic [ref=e80]:
            - generic [ref=e81]:
              - generic [ref=e82]:
                - generic [ref=e83]: chair
                - heading "المنتج والموقع" [level=3] [ref=e84]
              - generic [ref=e85]:
                - button "بيع من المخزن" [ref=e86] [cursor=pointer]
                - button "طلب مسبق (Backorder)" [ref=e87] [cursor=pointer]
            - generic [ref=e88]:
              - generic [ref=e89]:
                - text: اختيار القطعة من المخزون المتاح
                - combobox [ref=e90] [cursor=pointer]:
                  - option "اختر القطعة..." [selected]
                  - option "انتريه - (معرض الجامعة القديمة ) - 0 ج.م"
                  - option "Test Image Product - (معرض اباهيم سلامة ) - 2,500 ج.م"
                  - option "Oak Table - (معرض اباهيم سلامة ) - 7,500 ج.م"
              - generic [ref=e91]:
                - text: موقع المبيعات (الفرع الحالي)
                - combobox [ref=e92]:
                  - option "اختر الفرع..." [selected]
                  - option "معرض اباهيم سلامة"
                  - option "معرض الجامعة القديمة"
                  - option "مخزن اباهيم سلامة"
                  - option "مخزن الجامعة القديمة"
          - generic [ref=e93]:
            - generic [ref=e94]:
              - generic [ref=e95]: payments
              - heading "الاتفاق المالي" [level=3] [ref=e96]
            - generic [ref=e97]:
              - generic [ref=e98]:
                - text: السعر المتفق عليه (صافي الفاتورة)
                - generic [ref=e99]:
                  - spinbutton [ref=e100]
                  - generic [ref=e101]: ج.م
              - generic [ref=e102]:
                - text: المبلغ المدفوع (مقدم/عربون)
                - generic [ref=e103]:
                  - spinbutton [ref=e104]: "0"
                  - generic [ref=e105]: ج.م
          - generic [ref=e106]:
            - button "إلغاء" [ref=e107] [cursor=pointer]
            - button "تسجيل البيع نهائياً check_circle" [disabled] [ref=e108]:
              - generic [ref=e109]: تسجيل البيع نهائياً
              - generic [ref=e110]: check_circle
        - generic [ref=e112]:
          - heading "ملخص الفاتورة" [level=4] [ref=e113]
          - generic [ref=e114]:
            - generic [ref=e115]:
              - generic [ref=e116]: العميل
              - generic [ref=e117]: محمد أحمد علي
            - generic [ref=e118]:
              - generic [ref=e119]: نوع الطلب
              - generic [ref=e120]: تسليم فوري
            - generic [ref=e121]:
              - generic [ref=e122]:
                - generic [ref=e123]: القيمة الإجمالية
                - generic [ref=e124]: ج.م
              - generic [ref=e125]:
                - generic [ref=e126]: المسدد الآن
                - generic [ref=e127]: 0 ج.م
              - generic [ref=e128]:
                - generic [ref=e129]: المتبقي
                - generic [ref=e130]: 0 ج.م
          - generic [ref=e131]: "* بمجرد الحفظ، سيتم تحويل حالة القطعة من \"متاح\" إلى \"محجوز\" تلقائياً، وسيتم تسجيل الحركة في الخزنة."
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Kayan Furniture E2E Flow', () => {
  4  |   const baseUrl = 'http://localhost:4200';
  5  | 
  6  |   test('Complete Sales Lifecycle', async ({ page }) => {
  7  |     // 1. Login
  8  |     await page.goto(`${baseUrl}/login`);
  9  |     await page.getByPlaceholder('01xxxxxxxxx').fill('admin@kayan.com');
  10 |     await page.getByPlaceholder('••••••••').fill('admin123');
  11 |     await page.getByRole('button', { name: 'افتح الباب' }).click();
  12 | 
  13 |     // Verify login was successful
  14 |     await expect(page).toHaveURL(/.*dashboard/);
  15 |     await expect(page.getByText('رصيد الخزنة الحالي')).toBeVisible();
  16 | 
  17 |     // 2. Add a new Supplier
  18 |     await page.getByRole('link', { name: 'local_shipping الموردين' }).click();
  19 |     await page.getByRole('link', { name: 'add + مورد جديد' }).click();
  20 |     
  21 |     await page.getByPlaceholder('مثلاً: الحاج محمود للرخام').fill('Kayan Wood');
  22 |     await page.getByPlaceholder('01x xxxx xxxx').fill('01234567890');
  23 |     await page.getByPlaceholder('المكان فين بالظبط؟').fill('Damietta, Egypt');
  24 |     await page.getByPlaceholder('أي تفاصيل زيادة عن المورد ده.. بضاعته عاملة إزاي؟ مواعيده دقيقة؟').fill('Premium wood supplier');
  25 |     
  26 |     const saveSupplierBtn = page.getByRole('button', { name: 'حفظ المورد' });
  27 |     await expect(saveSupplierBtn).toBeEnabled();
  28 |     await saveSupplierBtn.click();
  29 |     
  30 |     // Verify redirection back to suppliers list
  31 |     await expect(page).toHaveURL(/.*suppliers/);
  32 |     await expect(page.getByText('Kayan Wood')).toBeVisible();
  33 | 
  34 |     // 3. Add a new Product
  35 |     await page.getByRole('link', { name: 'inventory_2 الجرد' }).click();
  36 |     await page.getByRole('button', { name: 'إضافة قطعة جديدة' }).click();
  37 |     
  38 |     await page.getByPlaceholder('مثلاً: انتريه كابتونيه مودرن').fill('Oak Table');
  39 |     await page.getByPlaceholder('مثلاً: غرف معيشة').fill('Dining Rooms');
  40 |     
  41 |     // Select Location using selectOption for stability
  42 |     await page.locator('select[formControlName="location_id"]').selectOption({ label: 'معرض اباهيم سلامة' });
  43 |     
  44 |     // Select Supplier (Shipment)
  45 |     await page.locator('select[formControlName="shipment_id"]').selectOption({ label: 'الحاج علاء - بدون رقم' });
  46 |     
  47 |     // Fill cost and sale price using more robust selectors
  48 |     await page.locator('input[formControlName="purchase_value"]').fill('5000');
  49 |     await page.locator('input[formControlName="sale_price"]').fill('7500');
  50 |     
  51 |     const saveProductBtn = page.getByRole('button', { name: 'حفظ وتأجيل الجرد' });
  52 |     await expect(saveProductBtn).toBeEnabled();
  53 |     await saveProductBtn.click();
  54 |     
  55 |     // Verify back to inventory
  56 |     await expect(page).toHaveURL(/.*inventory/);
  57 |     await expect(page.getByText('Oak Table'), { timeout: 10000 }).toBeVisible();
  58 | 
  59 |     // 4. Add a new Customer
  60 |     await page.getByRole('link', { name: 'person العملاء' }).click();
  61 |     await page.getByRole('button', { name: 'إضافة عميل جديد' }).click();
  62 |     
  63 |     await page.getByPlaceholder('مثلاً: محمد أحمد علي').fill('Test Customer');
  64 |     await page.getByPlaceholder('01xxxxxxxxx').fill('01112223334');
  65 |     await page.getByPlaceholder(/مثلاً: عميل دائم/).fill('E2E Test Customer');
  66 |     
  67 |     await page.getByRole('button', { name: 'تأكيد الإضافة والقيد بالدفاتر' }).click();
  68 |     
  69 |     // Verify customer added
  70 |     await expect(page.getByText('Test Customer'), { timeout: 10000 }).toBeVisible();
  71 | 
  72 |     // 5. Create a new Sale
  73 |     await page.getByRole('link', { name: 'sell المبيعات' }).click();
  74 |     await page.getByRole('button', { name: 'تسجيل بيع جديد' }).click();
  75 |     
  76 |     // Select Customer
  77 |     await page.locator('select[formControlName="customer_id"]').selectOption({ label: 'Test Customer (01112223334)' });
  78 |     
  79 |     // Select Product
> 80 |     await page.locator('select[formControlName="item_id"]').selectOption({ label: 'Oak Table - (معرض اباهيم سلامة) - 7,500 ج.م' });
     |                                                             ^ Error: locator.selectOption: Test timeout of 60000ms exceeded.
  81 |     
  82 |     // Select Sale Location
  83 |     await page.locator('select[formControlName="location_id"]').selectOption({ label: 'معرض اباهيم سلامة' });
  84 |     
  85 |     // Set Sale price and payment
  86 |     await page.locator('input[formControlName="agreed_price"]').fill('7000');
  87 |     await page.locator('input[formControlName="initial_payment"]').fill('1000');
  88 |     
  89 |     const saveSaleBtn = page.getByRole('button', { name: 'تسجيل البيع نهائياً' });
  90 |     await expect(saveSaleBtn).toBeEnabled();
  91 |     await saveSaleBtn.click();
  92 |     
  93 |     // 6. Verify Sale in list
  94 |     await expect(page).toHaveURL(/.*sales/);
  95 |     await expect(page.getByText('Test Customer')).toBeVisible();
  96 |     await expect(page.getByText('7,000')).toBeVisible();
  97 |   });
  98 | });
  99 | 
```