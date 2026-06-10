const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  const directorRole = await prisma.role.create({ data: { name: 'director', description: 'Full access' } });
  const managerRole = await prisma.role.create({ data: { name: 'manager', description: 'Manager access' } });
  const employeeRole = await prisma.role.create({ data: { name: 'employee', description: 'Basic access' } });
  await prisma.user.create({ data: { email: 'director@pulse.local', password: '$2b$12$xK40WM78VNT5t2bsR4zp9ua.lvhNSZjoghEfT4R5iqt1PXHbuhQSK', firstName: 'Alexey', lastName: 'Directorov', roleId: directorRole.id } });
  await prisma.user.create({ data: { email: 'manager@pulse.local', password: '$2b$12$xK40WM78VNT5t2bsR4zp9ua.lvhNSZjoghEfT4R5iqt1PXHbuhQSK', firstName: 'Maria', lastName: 'Managerova', roleId: managerRole.id } });
  await prisma.user.create({ data: { email: 'employee@pulse.local', password: '$2b$12$xK40WM78VNT5t2bsR4zp9ua.lvhNSZjoghEfT4R5iqt1PXHbuhQSK', firstName: 'Ivan', lastName: 'Sotrudnikov', roleId: employeeRole.id } });
  console.log('Seed done!');
}
main().catch(console.error).finally(async () => await prisma.$disconnect());
