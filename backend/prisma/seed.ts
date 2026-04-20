import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SYSTEM_PERMISSIONS = [
  { resource: 'companies', action: 'create' },
  { resource: 'companies', action: 'read' },
  { resource: 'companies', action: 'update' },
  { resource: 'companies', action: 'delete' },
  { resource: 'users', action: 'create' },
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'update' },
  { resource: 'users', action: 'delete' },
  { resource: 'roles', action: 'create' },
  { resource: 'roles', action: 'read' },
  { resource: 'roles', action: 'update' },
  { resource: 'roles', action: 'delete' },
  { resource: 'documents', action: 'create' },
  { resource: 'documents', action: 'read' },
  { resource: 'documents', action: 'update' },
  { resource: 'documents', action: 'delete' },
  { resource: 'documents', action: 'approve' },
  { resource: 'documents', action: 'publish' },
  { resource: 'documents', action: 'download' },
  { resource: 'distributions', action: 'create' },
  { resource: 'distributions', action: 'read' },
  { resource: 'distributions', action: 'confirm' },
  { resource: 'trainings', action: 'create' },
  { resource: 'trainings', action: 'read' },
  { resource: 'trainings', action: 'update' },
  { resource: 'trainings', action: 'delete' },
  { resource: 'audit', action: 'read' },
];

async function main(): Promise<void> {
  console.log('Starting seed...');

  // Upsert all system permissions
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: {
        resource: perm.resource,
        action: perm.action,
        description: `${perm.action} on ${perm.resource}`,
      },
    });
  }
  console.log(`Seeded ${SYSTEM_PERMISSIONS.length} permissions.`);

  // Create master company
  const masterCompany = await prisma.company.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      name: process.env.MASTER_COMPANY_NAME ?? 'Master Company',
      cnpj: '00.000.000/0001-00',
      email: 'contact@docmanager.com',
      plan: 'enterprise',
    },
  });
  console.log(`Master company: ${masterCompany.name} (${masterCompany.id})`);

  // Create ADMIN role for master company
  const adminRole = await prisma.role.upsert({
    where: { name_companyId: { name: 'ADMIN', companyId: masterCompany.id } },
    update: {},
    create: {
      companyId: masterCompany.id,
      name: 'ADMIN',
      description: 'System Administrator — full access',
      isSystem: true,
    },
  });

  // Assign all permissions to ADMIN role
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }
  console.log(`ADMIN role created with ${allPermissions.length} permissions.`);

  // Create master admin user
  const adminEmail = process.env.MASTER_ADMIN_EMAIL ?? 'admin@docmanager.com';
  const adminPassword = process.env.MASTER_ADMIN_PASSWORD ?? 'Admin@123456';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email_companyId: { email: adminEmail, companyId: masterCompany.id } },
    update: {},
    create: {
      companyId: masterCompany.id,
      name: 'Master Administrator',
      email: adminEmail,
      password: hashedPassword,
      isMaster: true,
    },
  });

  // Assign ADMIN role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log(`Master admin created: ${adminUser.email}`);
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
