const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('password123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@test.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create member user
  const memberPassword = await bcrypt.hash('password123', 12);
  const member = await prisma.user.upsert({
    where: { email: 'member@test.com' },
    update: {},
    create: {
      name: 'Test Member',
      email: 'member@test.com',
      password: memberPassword,
      role: 'MEMBER',
    },
  });

  // Create a sample project
  const project = await prisma.project.upsert({
    where: { id: 'sample-project-1' },
    update: {},
    create: {
      id: 'sample-project-1',
      name: 'Team Task Manager',
      description: 'The main project for our task management platform',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: member.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // Create sample tasks
  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'task-1',
        title: 'Set up CI/CD pipeline',
        description: 'Configure GitHub Actions for automated testing and deployment',
        status: 'TODO',
        priority: 'HIGH',
        projectId: project.id,
        creatorId: admin.id,
        assigneeId: admin.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'task-2',
        title: 'Design database schema',
        description: 'Create ERD and finalize Prisma schema for all entities',
        status: 'DONE',
        priority: 'URGENT',
        projectId: project.id,
        creatorId: admin.id,
        assigneeId: admin.id,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'task-3',
        title: 'Implement authentication',
        description: 'Build JWT-based auth with access and refresh tokens',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectId: project.id,
        creatorId: admin.id,
        assigneeId: member.id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'task-4',
        title: 'Build task board UI',
        description: 'Create Kanban board with drag-and-drop functionality',
        status: 'IN_REVIEW',
        priority: 'MEDIUM',
        projectId: project.id,
        creatorId: admin.id,
        assigneeId: member.id,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue
      },
    ],
  });

  console.log('✅ Seeding complete!');
  console.log('   Admin:  admin@test.com / password123');
  console.log('   Member: member@test.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
