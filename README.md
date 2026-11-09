## Library Management System — Data Layer & Catalog Engine

A production-ready relational data layer for the Library Management System, built with **NestJS**, **Prisma ORM**, and **PostgreSQL**. This repository implements a fully normalized schema supporting role-based access control, book cataloging, genre taxonomies, and patron reviews with strict referential integrity.

---

## Workspace Layout

The repository is structured with a decoupled backend service under the `api/` directory:

```text
library-management-system/
├── README.md                            # System architecture & schema documentation
└── api/                                 # NestJS backend application
    ├── .env.example                     # Environment configuration blueprint
    ├── package.json                     # Node dependencies, scripts & Prisma seed config
    ├── tsconfig.json                    # TypeScript compiler configuration
    ├── prisma/                          # Database modeling & migrations
    │   ├── schema.prisma                # Canonical Prisma schema definition
    │   └── seed.ts                      # Idempotent database seeder (Users, Genres, Books)
    └── src/                             # Application source code
        ├── main.ts                      # NestJS application entry point
        ├── app.module.ts                # Root application dependency graph
        └── prisma/                      # Database connectivity module
            ├── prisma.module.ts         # Global NestJS module exposing PrismaService
            └── prisma.service.ts        # PrismaClient lifecycle hook implementation
```

---

## Entity Relationship Overview

The schema is built around four core entities and an enumerated authorization role:

```text
   +-------------------+             +-------------------+
   |       User        |             |       Genre       |
   +-------------------+             +-------------------+
   | id (UUID) [PK]    |             | id (UUID) [PK]    |
   | email (Unique)    |             | name (Unique)     |
   | name              |             | description       |
   | role (Role Enum)  |             +---------+---------+
   +---------+---------+                       |
             | 1                               | 1
             |                                 |
             | N                               | N
   +---------v---------+             +---------v---------+
   |      Review       |             |       Book        |
   +-------------------+             +-------------------+
   | id (UUID) [PK]    |      N      | id (UUID) [PK]    |
   | rating (Int)      | >-----------+ isbn (Unique)     |
   | comment           |      1      | title             |
   | userId [FK]       |             | author            |
   | bookId [FK]       |             | publishedYear     |
   +-------------------+             | copiesAvailable   |
                                     | genreId [FK]      |
                                     +-------------------+
```

* **Role (Enum)**: Defines authorization tiers (`PATRON`, `LIBRARIAN`).
* **User**: System actors holding credentials, personal profiles, and assigned authorization roles.
* **Genre**: Independent catalog taxonomies classifying books into distinct subject areas.
* **Book**: Physical and digital assets in the catalog, linked to exactly one genre via foreign key.
* **Review**: Patron feedback capturing qualitative ratings and comments. Constrained by a unique compound index `@@unique([bookId, userId])` to enforce one review per patron per book.

---

## Setup & Migration Lifecycle

### 1. Prerequisites
* **Node.js**: `v18.x` or `v20.x` LTS
* **PostgreSQL Database**: Local server (`>= 14.x`) or a managed cloud database (Neon, Supabase, AWS RDS)
* **Package Manager**: `npm` (`>= 9.x`) or `pnpm`

### 2. Configure Environment Variables
Inside the `api/` directory, initialize your local environment file:

```bash
cd api
cp .env.example .env
```

Open `.env` and configure your database connection string:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/library_db?schema=public&sslmode=prefer"
PORT=3000
NODE_ENV=development
```

### 3. Install Dependencies
Install all required production dependencies and developer tooling:

```bash
npm install
```

### 4. Execute Migrations
Generate and run the initial migration against your target PostgreSQL database:

```bash
npx prisma migrate dev --name init_library_schema
```

This operation performs three sequential tasks:
1. Creates the underlying database schema and tables (`users`, `genres`, `books`, `reviews`).
2. Applies all foreign key constraints, default UUID generators, and uniqueness checks.
3. Automatically triggers `prisma generate` to compile a strongly typed TypeScript client in `node_modules/@prisma/client`.

For headless staging or production deployment pipelines, run:

```bash
npx prisma migrate deploy
```

### 5. Seed Database
Execute the automated seed script to populate baseline data:

```bash
npx prisma db seed
```

The seeder inserts:
* **4 Users**: 2 Librarians and 2 Patrons.
* **4 Core Genres**: *Computer Science & Software Engineering*, *Science Fiction*, *Oncology & Medical Sciences*, and *Economics & Financial Markets*.
* **16 Books**: 4 curated titles mapped to each genre with unique ISBNs and stock quantities.

### 6. Verify via Prisma Studio
Launch the visual database inspector:

```bash
npx prisma studio
```
Access the dashboard at `http://localhost:5555` to browse tables, verify relationships, and inspect foreign key links.

---

## Schema Decisions

### 1. Separate `Genre` Model vs. Embedded Field or Database Enum

A primary design choice is modeling `Genre` as a standalone relational table linked via foreign key (`Book.genreId -> Genre.id`) rather than storing it as an embedded scalar string column (`genre: String`) or a PostgreSQL enum (`genre: GenreEnum`). 

#### A. Preventing Data Drift and Category Duplication
Using a raw text column invites uncontrolled entry drift:
* `"Sci-Fi"`, `"Science Fiction"`, `"scifi"`, and `"Science-Fiction"` would be treated as completely different entities by database query engines.
* Renaming a genre requires executing a table-wide `UPDATE books SET genre = '...' WHERE genre = '...'`, which scans and locks thousands of catalog rows and invalidates read caches.

With a normalized `Genre` model:
* `Genre.name` is protected by a database-level `UNIQUE` constraint.
* Renaming a genre requires updating a single record in the `genres` table. Every associated book immediately reflects the update without altering `books` table records or touching book indexes.

#### B. Zero-Downtime Operations vs. Restrictive DDL Locking
Defining genres via a native PostgreSQL enum (`CREATE TYPE "Genre" AS ENUM (...)`) introduces structural friction in production environments:
* **DDL Locks**: While PostgreSQL allows adding enum values (`ALTER TYPE "Genre" ADD VALUE 'NewCategory'`), modifying, renaming, or removing existing enum members cannot be executed cleanly in place. It requires dropping constraints, recreating the enum type, casting columns, and rebuilding dependent indexes. During high-traffic periods, these DDL operations lock table metadata and block concurrent queries.
* **Dynamic Content Management**: In a functional library application, genres are managed by staff members (Librarians) via administrative user interfaces. Treating genres as database enum variants requires a code change, migration file, and application deployment every time a new category is introduced. Treating genres as relational rows turns category management into standard, non-blocking DML (`INSERT`, `UPDATE`, `DELETE`) transactions.

#### C. Relational Metadata Expansion
In enterprise cataloging, a genre is rarely a flat label. It carries essential domain-specific attributes:
* **Taxonomy Classifications**: Dewey Decimal or Library of Congress classification ranges.
* **Physical Layout Mapping**: Library section codes, floor numbers, and aisle markers.
* **Hierarchical Taxonomies**: Self-referential sub-genres (e.g., *Machine Learning* having *Computer Science* as a `parentId`).
* **Curator Notes**: Scope notes and descriptive blurbs displayed on public search portals.

Flattening a genre into a scalar string on `Book` violates First Normal Form (1NF) if attributes are encoded as delimited strings, or violates Third Normal Form (3NF) if metadata attributes are repeatedly denormalized across every book record.

#### D. Referential Integrity and Deletion Safety
The relation between `Book` and `Genre` is declared with explicit referential integrity:

```prisma
genre   Genre  @relation(fields: [genreId], references: [id], onDelete: Restrict)
```

The `onDelete: Restrict` clause protects the catalog from accidental data corruption. A library administrator cannot delete a genre from the system if active book titles are currently assigned to it. The database engine rejects the deletion at the constraint level, eliminating orphaned records.

#### E. Index Density and Join Performance
Storing a UUID foreign key (`genreId`) accompanied by `@@index([genreId])` creates a high-density, fixed-width B-Tree index. Querying books by category executes a single index seek:

```sql
SELECT * FROM "books" WHERE "genreId" = 'c4b8e2a1-...'
```

Fixed-width UUID keys take up significantly less index space and memory buffer cache than variable-width text strings, maximizing database I/O efficiency during high-concurrency catalog searches and paginated genre listings.

---

### 2. Modeling in Prisma (Relational) vs. Document Databases (MongoDB)

| Architectural Factor | Prisma + PostgreSQL (Relational) | Document Database (e.g., MongoDB) |
| :--- | :--- | :--- |
| **Data Placement** | Fully normalized tables (`books`, `reviews`, `genres`) linked by foreign keys. | Embedded subdocument arrays (`book.reviews: []`) or denormalized string tags. |
| **Unbounded Array Risk** | None. Reviews and books scale as individual row records independently. | High risk. Popular books with thousands of reviews approach document size limits (e.g., BSON 16 MB). |
| **Referential Integrity** | Enforced at the storage engine level via constraints (`ON DELETE CASCADE`, `RESTRICT`). | Handled purely through application logic; susceptible to orphan documents on ungraceful failures. |
| **Schema Symmetry** | Explicit bidirectional relations required (`User.reviews[]` and `Book.reviews[]`). | Unidirectional references; parents do not inherently require pointers to child documents. |
| **Read/Write Balance** | Optimized for write consistency, transactional integrity, and dynamic reporting. | Optimized for single-read retrieval of a book and its first few reviews in one operation. |

#### Architectural Reflection: The Shift from Document Embedding to Relational Rigor
Coming from a document database, the instinctive design is to embed child records directly inside the parent entity: storing a genre as a nested sub-object inside a `Book` document, or storing user reviews inside a `reviews: []` array on the book itself. In document stores, this eliminates join operations and optimizes read latency for product detail pages.

However, moving to a relational schema managed through Prisma reveals critical structural contrasts:

1. **Unbounded Growth Mitigation**: A popular library book may collect thousands of patron reviews over years of circulation. In MongoDB, embedding these reviews creates an anti-pattern: documents mutate in place, consume fragmented storage chunks, and can eventually breach hard BSON document boundaries (16 MB limit). In PostgreSQL, each review is an isolated row in the `reviews` table. It scales linearly without degrading the storage footprint or query performance of the primary `books` table.
2. **Mandatory Schema Duality**: In document databases, you can define a reference on one side of a collection without the target collection ever knowing about it. Prisma enforces bidirectional symmetry: defining a foreign key relation on `Review` requires declaring the reciprocal virtual relation fields on both `Book` (`reviews Review[]`) and `User` (`reviews Review[]`). This structural discipline forces developers to design the reverse access paths up front, making navigation from patrons to their authored reviews just as performant as navigation from books to their collected reviews.
3. **Engine-Level Guarantees**: Instead of writing manual cleanup hooks in service code to delete orphaned reviews when a book is retired, Prisma leverages PostgreSQL's native `onDelete: Cascade` constraint. The relational engine guarantees data consistency even if an application instance crashes midway through an operation.

---

## Technical Stack Reference

* **Framework**: NestJS (Modular Architecture, Dependency Injection)
* **ORM**: Prisma Client `v5.x`
* **Database**: PostgreSQL `14+`
* **Language**: TypeScript (`strict: true`)
* **Execution Utility**: `ts-node` for direct TypeScript database seeding