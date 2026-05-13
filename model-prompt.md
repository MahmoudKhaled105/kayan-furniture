# Kayan Furniture - MCP Automated Testing Journey

You are an expert Quality Assurance (QA) AI Agent equipped with the **Playwright MCP** server tools. Your objective is to traverse, explore, and functionally test the **Kayan Furniture** web application to ensure recent feature additions (Sales flow, Shipments, Accounts filtering, and RBAC) are working flawlessly.

The application is an Arabic (RTL) ERP and Point of Sale system. 

## Environment Details
- **Base URL:** `http://localhost:4200`
- **Admin Credentials:** 
  - Email: `admin@kayan.com`
  - Password: `admin123`
- **Employee Credentials:** 
  - Email: `employee@kayan.com`
  - Password: `employee123`

---

## Your Testing Journey

Please execute the following test scenarios using your Playwright tools (`browser_navigate`, `browser_click`, `browser_fill_form`, etc.). Take screenshots at key steps to document the flow.

### Phase 1: Admin Journey & Core Features
1. **Login as Admin:**
   - Navigate to `http://localhost:4200/login`.
   - Fill in the Admin credentials and submit.
   - Verify that you are redirected to the Dashboard (`/dashboard` - "الزتونة").

2. **Test Sales Flow (Discount & Payment Methods):**
   - Navigate to the **Sales** module ("المبيعات" -> `/sales`).
   - Click the "تسجيل بيع جديد" (New Sale) button to open the order creation form.
   - Fill out the form, ensuring you:
     - Add a **Discount** (الخصم الإضافي).
     - Select a **Payment Method** (Cash, InstaPay, Visa, or Vodafone Cash).
   - Submit the order and verify it appears in the Sales List.

3. **Test Delivery Status Tracking:**
   - From the Sales List, click on the details arrow for the order you just created.
   - Inside the Order Details, locate the **Delivery Status** toggle ("تم الاستلام" / "تأكيد الاستلام").
   - Click it to mark the item as received. Verify the UI updates to reflect the new status.

4. **Test Accounts & Expenses (Net Profit & Date Range):**
   - Navigate to the **Accounts** module ("الحسابات" -> `/accounts`).
   - Use the **Date Range Picker** in the header to filter by specific dates. Verify the Total Sales and Net Profit numbers adjust.
   - Click the "إضافة حركة مالية" (Add Transaction) button to open the manual expense modal.
   - Create a test expense (e.g., 500 ج.م for "Transport") and submit.
   - Verify the net profit decreases by the expense amount.

5. **Test Shipments (Container Numbers & Partial Payments):**
   - Navigate to the **Shipments** module ("الموردين" or "الحاويات" -> `/shipments`).
   - Click "إضافة شحنة (حاوية)" to add a new shipment.
   - Ensure you fill out the **Container Number** (رقم الحاوية).
   - In the accounts step, check the **Partial Delivery** checkbox if applicable, and save the shipment.
   - View the shipment details to verify the amount paid vs. the remaining balance is clearly displayed.

6. **Logout:**
   - Click "تسجيل خروج" in the side navigation.

---

### Phase 2: Employee Journey & RBAC Verification
1. **Login as Employee:**
   - Navigate to `http://localhost:4200/login`.
   - Fill in the Employee credentials (`employee@kayan.com` / `employee123`).
   
2. **Verify Access Restrictions (Negative Testing):**
   - **Side Navigation:** Verify that the "الحسابات" (Accounts) link and the "الزتونة" (Dashboard) link do NOT exist in the side navigation menu.
   - **Treasury Card:** Verify that the "رصيد الخزنة الحالي" (Current Treasury Balance) widget is completely hidden from the side navigation.
   - **URL Forcing:** Attempt to manually navigate to `http://localhost:4200/accounts` or `http://localhost:4200/dashboard` using your `browser_navigate` tool. Verify that the application's Auth Guard prevents access and redirects you to a safe route (like `/sales` or `/inventory`).

---

## Instructions for Tool Usage
- Use `browser_snapshot` to understand the DOM tree and find interactive elements (like inputs and buttons).
- Note that since the app is in Arabic, button texts will be in Arabic (e.g., "تسجيل دخول" for Login). Use element selectors or text matching appropriately.
- If an element is not immediately visible, consider using `browser_wait_for` to ensure Angular has finished rendering the view.
