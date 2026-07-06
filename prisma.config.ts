// Prisma 7 configuration (replaces datasource `url` in schema.prisma).
// Used by the Prisma CLI for migrations and introspection. Runtime queries go
// through the driver adapter configured in modules/db.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Read directly from process.env (not prisma's env(), which throws when the
  // var is empty). Migration commands will surface a clear error if it's unset.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
