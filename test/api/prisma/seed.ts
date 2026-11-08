import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning existing records ---');
  await prisma.book.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.user.deleteMany();

  console.log('--- Seeding Roles & Users ---');
  await prisma.user.createMany({
    data: [
      {
        email: 'head.librarian@library.org',
        name: 'Peter Gitonga',
        role: Role.LIBRARIAN,
      },
      {
        email: 'assistant.librarian@library.org',
        name: 'Richard Ochieng',
        role: Role.LIBRARIAN,
      },
      {
        email: 'patron.alex@gmail.com',
        name: 'Alex Mwangi',
        role: Role.PATRON,
      },
      {
        email: 'patron.clara@gmail.com',
        name: 'Helena Chami',
        role: Role.PATRON,
      },
    ],
  });

  console.log('--- Seeding Genres ---');
  const genresData = [
    {
      name: 'Computer Science & Software Engineering',
      description: 'System design, programming languages, and computing architecture.',
    },
    {
      name: 'Science Fiction',
      description: 'Speculative fiction exploring futuristic concepts, space, and technology.',
    },
    {
      name: 'Clinical Oncology',
      description: 'Clinical pathology, oncology protocols, and management of different malignacies.',
    },
    {
      name: 'Stock trading & Financial Markets',
      description: 'Macroeconomics, equity analysis, and institutional corporate finance.',
    },
  ];

  const genres = await Promise.all(
    genresData.map((genre) =>
      prisma.genre.upsert({
        where: { name: genre.name },
        update: {},
        create: genre,
      }),
    ),
  );

  const [csGenre, scifiGenre, medGenre, econGenre] = genres;

  console.log('--- Seeding Books ---');
  const books = [
    // Computer Science & Software Engineering
    {
      title: 'Designing Data-Intensive Applications',
      isbn: '978-1449373320',
      author: 'Martin Kleppmann',
      publishedYear: 2017,
      copiesAvailable: 5,
      genreId: csGenre.id,
    },
    {
      title: 'Clean Architecture: A Craftsman’s Guide',
      isbn: '978-0134494166',
      author: 'Robert C. Martin',
      publishedYear: 2017,
      copiesAvailable: 3,
      genreId: csGenre.id,
    },
    {
      title: 'Database Internals: A Deep Dive into Distributed Systems',
      isbn: '978-1492040347',
      author: 'Alex Petrov',
      publishedYear: 2019,
      copiesAvailable: 2,
      genreId: csGenre.id,
    },
    {
      title: 'Patterns of Enterprise Application Architecture',
      isbn: '978-0321127426',
      author: 'Martin Fowler',
      publishedYear: 2002,
      copiesAvailable: 2,
      genreId: csGenre.id,
    },

    // Science Fiction
    {
      title: 'Dune',
      isbn: '978-0441172719',
      author: 'Frank Herbert',
      publishedYear: 1965,
      copiesAvailable: 6,
      genreId: scifiGenre.id,
    },
    {
      title: 'Neuromancer',
      isbn: '978-0441569595',
      author: 'William Gibson',
      publishedYear: 1984,
      copiesAvailable: 4,
      genreId: scifiGenre.id,
    },
    {
      title: 'Foundation',
      isbn: '978-0553293357',
      author: 'Isaac Asimov',
      publishedYear: 1951,
      copiesAvailable: 3,
      genreId: scifiGenre.id,
    },
    {
      title: 'The Three-Body Problem',
      isbn: '978-0765382030',
      author: 'Cixin Liu',
      publishedYear: 2008,
      copiesAvailable: 5,
      genreId: scifiGenre.id,
    },

    // Oncology & Medical Sciences
    {
      title: 'The Emperor of All Maladies: A Biography of Cancer',
      isbn: '978-1439170915',
      author: 'Siddhartha Mukherjee',
      publishedYear: 2010,
      copiesAvailable: 4,
      genreId: medGenre.id,
    },
    {
      title: 'DeVita, Hellman, and Rosenberg’s Cancer: Principles & Practice of Oncology',
      isbn: '978-1496394637',
      author: 'Vincent T. DeVita Jr.',
      publishedYear: 2018,
      copiesAvailable: 2,
      genreId: medGenre.id,
    },
    {
      title: 'Principles of Molecular Oncology',
      isbn: '978-1588295668',
      author: 'Miguel H. Bronchud',
      publishedYear: 2008,
      copiesAvailable: 1,
      genreId: medGenre.id,
    },
    {
      title: 'Robbins & Cotran Pathologic Basis of Disease',
      isbn: '978-0323531139',
      author: 'Vinay Kumar',
      publishedYear: 2020,
      copiesAvailable: 3,
      genreId: medGenre.id,
    },

    // Economics & Financial Markets
    {
      title: 'The Intelligent Investor',
      isbn: '978-0060555665',
      author: 'Benjamin Graham',
      publishedYear: 1949,
      copiesAvailable: 5,
      genreId: econGenre.id,
    },
    {
      title: 'Security Analysis',
      isbn: '978-0071592536',
      author: 'Benjamin Graham & David Dodd',
      publishedYear: 1934,
      copiesAvailable: 2,
      genreId: econGenre.id,
    },
    {
      title: 'Principles for Dealing with the Changing World Order',
      isbn: '978-1982160272',
      author: 'Ray Dalio',
      publishedYear: 2021,
      copiesAvailable: 4,
      genreId: econGenre.id,
    },
    {
      title: 'A Random Walk Down Wall Street',
      isbn: '978-0393358384',
      author: 'Burton G. Malkiel',
      publishedYear: 2019,
      copiesAvailable: 3,
      genreId: econGenre.id,
    },
  ];

  for (const book of books) {
    await prisma.book.upsert({
      where: { isbn: book.isbn },
      update: {},
      create: book,
    });
  }

  console.log(`Successfully seeded:`);
  console.log(`- 4 Users (Librarians & Patrons)`);
  console.log(`- ${genres.length} Genres`);
  console.log(`- ${books.length} Books`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });