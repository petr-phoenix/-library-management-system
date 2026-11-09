import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './api/prisma/schema.prisma',
  datasource: {
    url: 'postgresql://postgres:Ptah%401205@localhost:5432/library_db?schema=public',
  },
});
