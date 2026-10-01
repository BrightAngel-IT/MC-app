const dotenv = require("dotenv");
const { PrismaClient } = require("./prisma/generated/client");
const { neon } = require('@neondatabase/serverless');
const { PrismaNeonHTTP } = require('@prisma/adapter-neon');

dotenv.config();
const adapter = new PrismaNeonHTTP(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;