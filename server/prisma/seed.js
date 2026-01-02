const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default folders
  const folders = [
    { name: 'CS SOFT', type: 'COMPANY', color: '#2563EB', icon: '🏢', order: 1 },
    { name: 'Tendrio', type: 'COMPANY', color: '#7C3AED', icon: '🏢', order: 2 },
    { name: 'JATIS', type: 'COMPANY', color: '#059669', icon: '🏢', order: 3 },
    { name: 'Kolo Na Kolo', type: 'PROJECT', color: '#EA580C', icon: '🚴', order: 4 },
    { name: 'GPF1.cz', type: 'PROJECT', color: '#DC2626', icon: '🏎️', order: 5 },
    { name: 'Life Management', type: 'PERSONAL', color: '#0891B2', icon: '🏠', order: 6 },
  ];

  // Check if folders already exist
  const existingCount = await prisma.folder.count();
  
  if (existingCount === 0) {
    for (const folder of folders) {
      await prisma.folder.create({ data: folder });
    }
    console.log('Created default folders.');
  } else {
    console.log('Folders already exist, skipping seed.');
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
