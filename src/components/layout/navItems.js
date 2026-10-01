/**
 * Navigation per role. `mobile: true` items appear in the bottom bar (max 4);
 * everything else is reachable from the bottom bar's "More" sheet.
 */
export const NAV_ITEMS = {
  member: [
    { to: '/app', label: 'Dashboard', icon: 'dashboard', end: true, mobile: true },
    { to: '/app/classes', label: 'Classes', icon: 'calendar', mobile: true },
    { to: '/app/bookings', label: 'My Bookings', icon: 'ticket' },
    { to: '/app/workouts', label: 'Workouts', icon: 'dumbbell', mobile: true },
    { to: '/app/plan', label: 'Workout Plan', icon: 'clipboard' },
    { to: '/app/progress', label: 'Progress', icon: 'chart', mobile: true },
    { to: '/app/trainers', label: 'Trainers', icon: 'whistle' },
    { to: '/app/membership', label: 'Membership', icon: 'card' },
    { to: '/app/profile', label: 'Profile', icon: 'user' },
  ],
  trainer: [
    { to: '/trainer', label: 'Dashboard', icon: 'dashboard', end: true, mobile: true },
    { to: '/trainer/clients', label: 'Clients', icon: 'users', mobile: true },
    { to: '/trainer/classes', label: 'My Classes', icon: 'calendar', mobile: true },
    { to: '/trainer/profile', label: 'Profile', icon: 'user', mobile: true },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true, mobile: true },
    { to: '/admin/members', label: 'Members', icon: 'users', mobile: true },
    { to: '/admin/trainers', label: 'Trainers', icon: 'whistle' },
    { to: '/admin/classes', label: 'Classes', icon: 'calendar', mobile: true },
    { to: '/admin/plans', label: 'Plans', icon: 'layers' },
    { to: '/admin/payments', label: 'Payments', icon: 'receipt', mobile: true },
    { to: '/admin/reports', label: 'Reports', icon: 'file' },
    { to: '/admin/settings', label: 'Settings', icon: 'settings' },
    { to: '/admin/profile', label: 'Profile', icon: 'user' },
  ],
};

export const ROLE_LABEL = { member: 'Member', trainer: 'Trainer', admin: 'Admin' };
