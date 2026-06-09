import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Заполнение базы данных...\n');

  const directorRole = await prisma.role.create({ data: { name: 'director', description: 'Полный доступ' } });
  const managerRole = await prisma.role.create({ data: { name: 'manager', description: 'Доступ менеджера' } });
  const employeeRole = await prisma.role.create({ data: { name: 'employee', description: 'Базовый доступ' } });

  const password = await bcrypt.hash('password123', 12);

  const director = await prisma.user.create({ data: { email: 'director@pulse.local', password, firstName: 'Алексей', lastName: 'Директоров', roleId: directorRole.id } });
  const manager = await prisma.user.create({ data: { email: 'manager@pulse.local', password, firstName: 'Мария', lastName: 'Менеджерова', roleId: managerRole.id } });
  const employee = await prisma.user.create({ data: { email: 'employee@pulse.local', password, firstName: 'Иван', lastName: 'Сотрудников', roleId: employeeRole.id } });

  await prisma.employee.create({ data: { userId: director.id, employeeId: 'EMP001', position: 'CEO', department: 'Руководство', hireDate: new Date('2020-01-01'), salary: 500000, skills: 'управление,стратегия', phone: '+7-999-001' } });
  await prisma.employee.create({ data: { userId: manager.id, employeeId: 'EMP002', position: 'Project Manager', department: 'Разработка', hireDate: new Date('2021-03-15'), salary: 250000, skills: 'agile,scrum', phone: '+7-999-002' } });
  await prisma.employee.create({ data: { userId: employee.id, employeeId: 'EMP003', position: 'Developer', department: 'Разработка', hireDate: new Date('2022-06-01'), salary: 150000, skills: 'node.js,typescript,react', phone: '+7-999-003' } });

  console.log('✅ База данных заполнена!\n');
  console.log('📧 Тестовые аккаунты:');
  console.log('   Директор:  director@pulse.local / password123');
  console.log('   Менеджер:  manager@pulse.local / password123');
  console.log('   Сотрудник: employee@pulse.local / password123\n');
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
