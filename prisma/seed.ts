import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Administrator with full access',
      hierarchy: 3,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Manager with team management access',
      hierarchy: 2,
    },
  });

  const agentRole = await prisma.role.upsert({
    where: { name: 'Agent' },
    update: {},
    create: {
      name: 'Agent',
      description: 'Agent with work access',
      hierarchy: 1,
    },
  });

  const customerRole = await prisma.role.upsert({
    where: { name: 'Customer' },
    update: {},
    create: {
      name: 'Customer',
      description: 'Customer with portal access',
      hierarchy: 0,
    },
  });

  console.log('✅ Roles created');

  // Create permissions
  const permissions = [
    {
      name: 'view_dashboard',
      description: 'View dashboard',
      category: 'dashboard',
      isSystem: true,
    },
    {
      name: 'manage_users',
      description: 'Manage users',
      category: 'users',
      isSystem: true,
    },
    {
      name: 'view_users',
      description: 'View users',
      category: 'users',
      isSystem: true,
    },
    {
      name: 'create_users',
      description: 'Create users',
      category: 'users',
      isSystem: true,
    },
    {
      name: 'update_users',
      description: 'Update users',
      category: 'users',
      isSystem: true,
    },
    {
      name: 'delete_users',
      description: 'Delete users',
      category: 'users',
      isSystem: true,
    },
    {
      name: 'suspend_users',
      description: 'Suspend users',
      category: 'users',
      isSystem: true,
    },
    {
      name: 'ban_users',
      description: 'Ban users',
      category: 'users',
      isSystem: true,
    },
    {
      name: 'manage_permissions',
      description: 'Manage permissions',
      category: 'permissions',
      isSystem: true,
    },
    {
      name: 'view_permissions',
      description: 'View permissions',
      category: 'permissions',
      isSystem: true,
    },
    {
      name: 'manage_roles',
      description: 'Manage roles',
      category: 'roles',
      isSystem: true,
    },
    {
      name: 'view_roles',
      description: 'View roles',
      category: 'roles',
      isSystem: true,
    },
    {
      name: 'view_leads',
      description: 'View leads',
      category: 'leads',
      isSystem: true,
    },
    {
      name: 'manage_leads',
      description: 'Manage leads',
      category: 'leads',
      isSystem: true,
    },
    {
      name: 'create_leads',
      description: 'Create leads',
      category: 'leads',
      isSystem: true,
    },
    {
      name: 'manage_tasks',
      description: 'Manage tasks',
      category: 'tasks',
      isSystem: true,
    },
    {
      name: 'view_tasks',
      description: 'View tasks',
      category: 'tasks',
      isSystem: true,
    },
    {
      name: 'view_reports',
      description: 'View reports',
      category: 'reports',
      isSystem: true,
    },
    {
      name: 'manage_reports',
      description: 'Manage reports',
      category: 'reports',
      isSystem: true,
    },
    {
      name: 'view_audit_logs',
      description: 'View audit logs',
      category: 'audit',
      isSystem: true,
    },
    {
      name: 'manage_settings',
      description: 'Manage settings',
      category: 'settings',
      isSystem: true,
    },
    {
      name: 'customer_portal_access',
      description: 'Access customer portal',
      category: 'customer-portal',
      isSystem: true,
    },
  ];

  const createdPermissions = await Promise.all(
    permissions.map((p) =>
      prisma.permission.upsert({
        where: { name: p.name },
        update: {},
        create: p,
      }),
    ),
  );

  console.log('✅ Permissions created');

  // Assign permissions to admin role (all permissions)
  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ Admin role permissions assigned');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      roleId: adminRole.id,
    },
  });

  console.log('✅ Admin user created');
  console.log(
    '   Email: admin@example.com',
  );
  console.log('   Password: admin123456');

  // Create sample manager
  const managerPassword = await bcrypt.hash('manager123456', 10);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      username: 'manager',
      password: managerPassword,
      firstName: 'Manager',
      lastName: 'User',
      role: 'MANAGER',
      status: 'ACTIVE',
      roleId: managerRole.id,
    },
  });

  console.log('✅ Manager user created');
  console.log('   Email: manager@example.com');
  console.log('   Password: manager123456');

  // Create sample agent
  const agentPassword = await bcrypt.hash('agent123456', 10);

  const agent = await prisma.user.upsert({
    where: { email: 'agent@example.com' },
    update: {},
    create: {
      email: 'agent@example.com',
      username: 'agent',
      password: agentPassword,
      firstName: 'Agent',
      lastName: 'User',
      role: 'AGENT',
      status: 'ACTIVE',
      roleId: agentRole.id,
      managerId: manager.id,
    },
  });

  console.log('✅ Agent user created');
  console.log('   Email: agent@example.com');
  console.log('   Password: agent123456');

  // Create sample customer
  const customerPassword = await bcrypt.hash('customer123456', 10);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      username: 'customer',
      password: customerPassword,
      firstName: 'Customer',
      lastName: 'User',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      roleId: customerRole.id,
    },
  });

  console.log('✅ Customer user created');
  console.log('   Email: customer@example.com');
  console.log('   Password: customer123456');

  // Create some sample data
  const lead = await prisma.lead.create({
    data: {
      title: 'Sample Lead',
      description: 'This is a sample lead',
      email: 'lead@example.com',
      status: 'new',
      source: 'web',
      assignedToId: agent.id,
    },
  });

  const task = await prisma.task.create({
    data: {
      title: 'Sample Task',
      description: 'This is a sample task',
      status: 'todo',
      priority: 'medium',
      assignedToId: agent.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  console.log('✅ Sample data created');

  console.log('\n🌱 Seeding complete!\n');
  console.log('Test Credentials:');
  console.log('─────────────────');
  console.log('Admin:    admin@example.com / admin123456');
  console.log('Manager:  manager@example.com / manager123456');
  console.log('Agent:    agent@example.com / agent123456');
  console.log('Customer: customer@example.com / customer123456\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
