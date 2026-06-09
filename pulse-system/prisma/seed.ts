import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const directorRole = await prisma.role.create({ data: { name: 'director', description: 'Full access' } });
  const managerRole = await prisma.role.create({ data: { name: 'manager', description: 'Manager access' } });
  const employeeRole = await prisma.role.create({ data: { name: 'employee', description: 'Basic access' } });

  const resources = ['users', 'employees', 'chats', 'analytics', 'crm', 'info-banks'];
  for (const resource of resources) {
    for (const action of ['create', 'read', 'update', 'delete']) {
      await prisma.permission.create({ data: { roleId: directorRole.id, resource, action } });
    }
  }
  const managerResources = ['employees', 'chats', 'analytics', 'crm', 'info-banks'];
  for (const resource of managerResources) {
    for (const action of ['create', 'read', 'update']) {
      await prisma.permission.create({ data: { roleId: managerRole.id, resource, action } });
    }
  }
  await prisma.permission.create({ data: { roleId: employeeRole.id, resource: 'info-banks', action: 'read' } });

  const password = await bcrypt.hash('password123', 12);

  const director = await prisma.user.create({ data: { email: 'director@pulse.local', password, firstName: 'John', lastName: 'Director', roleId: directorRole.id } });
  const manager = await prisma.user.create({ data: { email: 'manager@pulse.local', password, firstName: 'Jane', lastName: 'Manager', roleId: managerRole.id } });
  const employee = await prisma.user.create({ data: { email: 'employee@pulse.local', password, firstName: 'Bob', lastName: 'Employee', roleId: employeeRole.id } });

  await prisma.employee.create({ data: { userId: director.id, employeeId: 'EMP001', position: 'CEO', department: 'Executive', hireDate: new Date('2020-01-01'), salary: 500000 } });
  await prisma.employee.create({ data: { userId: manager.id, employeeId: 'EMP002', position: 'Project Manager', department: 'Engineering', hireDate: new Date('2021-03-15'), salary: 250000 } });
  await prisma.employee.create({ data: { userId: employee.id, employeeId: 'EMP003', position: 'Developer', department: 'Engineering', hireDate: new Date('2022-06-01'), salary: 150000 } });

  console.log('✅ Seed completed!');
  console.log('📧 Test accounts:');
  console.log('   Director: director@pulse.local / password123');
  console.log('   Manager: manager@pulse.local / password123');
  console.log('   Employee: employee@pulse.local / password123');
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
