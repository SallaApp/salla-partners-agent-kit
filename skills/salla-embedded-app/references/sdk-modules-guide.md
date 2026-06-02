# Embedded SDK — Module Guide

Complete method reference for all five SDK modules with examples.

---

## Initialization

Always initialize before using any module:

```ts
import Salla from '@salla.sa/embedded-sdk';

// Initialize once on page load
await Salla.init();
```

---

## Auth Module

Handles token management between the iframe and the dashboard shell.

```ts
// Get current access token
const token = await Salla.auth.getToken();

// Refresh the token (returns new token)
const newToken = await Salla.auth.refreshToken();

// Check if user is authenticated
const isAuth = await Salla.auth.isAuthenticated();

// Listen for token refresh events
Salla.auth.onTokenRefresh((token) => {
  // update your API client headers
  apiClient.setToken(token);
});
```

**When to use:**
- Before every API call — tokens expire; always use `getToken()` rather than caching
- On `onTokenRefresh` — update your fetch headers without reloading

---

## Page Module

Controls the document title, navigation history, and iframe height.

```ts
// Set the page title shown in the dashboard breadcrumb
Salla.page.setTitle('My App — Settings');

// Auto-resize iframe to content height (call after DOM changes)
Salla.page.resize();

// Navigate to another embedded page (pushes to dashboard history)
Salla.page.navigate('/my-app/orders');

// Get the current page URL context
const url = Salla.page.getUrl();

// Listen for navigation events from the dashboard
Salla.page.onNavigate((url) => {
  router.push(url);
});
```

**When to use:**
- Call `setTitle` on every route change
- Call `resize()` after any dynamic content load (data fetch, accordion open, etc.)
- Use `navigate()` instead of `window.location` for dashboard-aware routing

---

## Nav Module

Customizes the top navigation bar of the Salla Merchant Dashboard while your app is active.

```ts
// Add an action button to the dashboard nav bar
Salla.nav.addButton({
  id: 'save-btn',
  label: { en: 'Save', ar: 'حفظ' },
  icon: 'material-outline-save',
  type: 'primary',            // 'primary' | 'secondary' | 'danger'
  onClick: () => saveForm(),
});

// Update button state
Salla.nav.updateButton('save-btn', { disabled: true, label: { en: 'Saving...', ar: 'جارٍ الحفظ...' } });

// Remove a button
Salla.nav.removeButton('save-btn');

// Clear all custom buttons
Salla.nav.clearButtons();

// Set breadcrumb trail
Salla.nav.setBreadcrumb([
  { label: { en: 'My App', ar: 'تطبيقي' }, url: '/my-app' },
  { label: { en: 'Settings', ar: 'الإعدادات' } },
]);
```

**When to use:**
- Add Save/Cancel buttons to the nav when editing forms (keeps nav consistent with Salla UX)
- Update `disabled` state during async operations to prevent double-submit

---

## UI Module

Triggers native Salla dashboard UI components — toasts, modals, confirms, and loaders.

### Toasts

```ts
Salla.ui.toast.success('Settings saved successfully');
Salla.ui.toast.error('Failed to connect — check your API key');
Salla.ui.toast.warning('Sandbox mode is active');
Salla.ui.toast.info('Syncing 142 orders...');

// With options
Salla.ui.toast.success('Done!', { duration: 5000, position: 'top-right' });
```

### Modals

```ts
// Open an informational modal
Salla.ui.modal.open({
  title: { en: 'Import Complete', ar: 'اكتمل الاستيراد' },
  body: { en: '142 orders imported successfully.', ar: 'تم استيراد 142 طلبًا بنجاح.' },
  confirmLabel: { en: 'Done', ar: 'تم' },
  onConfirm: () => Salla.ui.modal.close(),
});

// Close programmatically
Salla.ui.modal.close();
```

### Confirm Dialogs

```ts
// Returns Promise<boolean>
const confirmed = await Salla.ui.confirm({
  title: { en: 'Delete record?', ar: 'حذف السجل؟' },
  body: { en: 'This cannot be undone.', ar: 'لا يمكن التراجع عن هذا الإجراء.' },
  confirmLabel: { en: 'Delete', ar: 'حذف' },
  confirmType: 'danger',
  cancelLabel: { en: 'Cancel', ar: 'إلغاء' },
});

if (confirmed) {
  await deleteRecord(id);
}
```

### Loading Overlay

```ts
// Show full-page loader
Salla.ui.loading.show({ message: { en: 'Syncing orders...', ar: 'مزامنة الطلبات...' } });

// Hide loader
Salla.ui.loading.hide();

// Use with async operation
Salla.ui.loading.show();
try {
  await syncOrders();
  Salla.ui.toast.success('Sync complete');
} finally {
  Salla.ui.loading.hide();
}
```

---

## Checkout Module

Manages subscriptions and app add-ons from within the embedded app.

```ts
// Get available add-ons for this app
const addOns = await Salla.checkout.getAppAddOns();
// Returns: [{ id, name, price, currency, description }]

// Open the subscription/upgrade flow
await Salla.checkout.subscribe({
  plan_id: 'pro-monthly',
  addon_ids: ['extra-users', 'analytics'],
});

// Check current subscription status
const subscription = await Salla.checkout.getSubscription();
// Returns: { plan_id, status, expires_at, features }

// Listen for successful subscription
Salla.checkout.onSubscribed((subscription) => {
  unlockProFeatures(subscription.plan_id);
});
```

---

## Resources

| Module | Full Reference |
| --- | --- |
| Auth | https://docs.salla.dev/embedded-sdk/modules/auth.md |
| Page | https://docs.salla.dev/embedded-sdk/modules/page.md |
| Nav | https://docs.salla.dev/embedded-sdk/modules/nav.md |
| UI | https://docs.salla.dev/embedded-sdk/modules/ui.md |
| Checkout | https://docs.salla.dev/embedded-sdk/modules/checkout.md |
