// src/server.js — Local development server
// Only used locally. Vercel uses api/index.js instead.
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
  const { PrismaPg } = require("@prisma/adapter-pg");

    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        });

        const prisma = new PrismaClient({ adapter });

        module.exports = prisma;
  
const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 VenDoor API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
