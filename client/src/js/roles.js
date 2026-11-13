export const ROLES = {
  admin:      { label: 'Administrator', home: '/pages/admin/dashboard.html' },
  sales:      { label: 'Sales',         home: '/pages/customers/index.html' },
  accounting: { label: 'Accounting',    home: '/pages/accounting/index.html' },
  marketing:  { label: 'Marketing',     home: '/pages/marketing/index.html' }
};

// Sidebar menu: which roles see which link
export const MENU = [
  { label: 'Dashboard',  href: '/pages/admin/dashboard.html',  roles: ['admin'] },
  { label: 'Customers',  href: '/pages/customers/index.html',  roles: ['admin', 'sales'] },
  { label: 'Accounting', href: '/pages/accounting/index.html', roles: ['admin', 'accounting'] },
  { label: 'Marketing',  href: '/pages/marketing/index.html',  roles: ['admin', 'marketing'] },
  { label: 'Tasks',      href: '/pages/tasks/index.html',      roles: ['admin', 'sales', 'accounting', 'marketing'] },
  { label: 'Attendance', href: '/pages/attendance/index.html', roles: ['admin', 'sales', 'accounting', 'marketing'] },
  { label: 'Leave',      href: '/pages/leave/index.html',      roles: ['admin', 'sales', 'accounting', 'marketing'] }
];

export const homeFor = (role) => ROLES[role]?.home || '/';
export const menuFor = (role) => MENU.filter(m => m.roles.includes(role));
