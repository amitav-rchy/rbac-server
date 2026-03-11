// Common constants and enums used throughout the application

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  AGENT = 'AGENT',
  CUSTOMER = 'CUSTOMER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  INACTIVE = 'INACTIVE',
}

export const ROLE_HIERARCHY = {
  [UserRole.CUSTOMER]: 0,
  [UserRole.AGENT]: 1,
  [UserRole.MANAGER]: 2,
  [UserRole.ADMIN]: 3,
};

// Common permission names
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',
  
  // User Management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  UPDATE_USERS: 'update_users',
  DELETE_USERS: 'delete_users',
  SUSPEND_USERS: 'suspend_users',
  BAN_USERS: 'ban_users',
  
  // Permission Management
  MANAGE_PERMISSIONS: 'manage_permissions',
  VIEW_PERMISSIONS: 'view_permissions',
  
  // Role Management
  MANAGE_ROLES: 'manage_roles',
  VIEW_ROLES: 'view_roles',
  
  // Lead Management
  VIEW_LEADS: 'view_leads',
  MANAGE_LEADS: 'manage_leads',
  CREATE_LEADS: 'create_leads',
  
  // Task Management
  MANAGE_TASKS: 'manage_tasks',
  VIEW_TASKS: 'view_tasks',
  
  // Reports
  VIEW_REPORTS: 'view_reports',
  MANAGE_REPORTS: 'manage_reports',
  
  // Audit Logs
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  
  // Settings
  MANAGE_SETTINGS: 'manage_settings',
  
  // Customer Portal
  CUSTOMER_PORTAL_ACCESS: 'customer_portal_access',
};

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: Object.values(PERMISSIONS),
  [UserRole.MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_PERMISSIONS,
    PERMISSIONS.VIEW_ROLES,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.CREATE_LEADS,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  [UserRole.AGENT]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.CREATE_LEADS,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.VIEW_REPORTS,
  ],
  [UserRole.CUSTOMER]: [PERMISSIONS.CUSTOMER_PORTAL_ACCESS],
};
