// Who lands where after login, and which menu links each role sees.
export const ROLE_HOME = {
  admin: '/pages/admin/dashboard.html',
  sales: '/pages/customers/index.html',
  marketing: '/pages/customers/index.html',
  accountant: '/pages/accounting/index.html',
};

export const NAV = [
  { label: 'Dashboard',  href: '/pages/admin/dashboard.html',  roles: ['admin'] },
  { label: 'Customers',  href: '/pages/customers/index.html',  roles: ['admin', 'sales', 'marketing'] },
  { label: 'Accounting', href: '/pages/accounting/index.html', roles: ['admin', 'accountant'] },
];

export const ROLE_LABEL = {
  admin: 'Admin',
  sales: 'Sales Employee',
  marketing: 'Marketing Employee',
  accountant: 'Accounting Employee',
};
