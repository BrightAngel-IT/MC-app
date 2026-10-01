const dotenv = require("dotenv");
dotenv.config();

const { PrismaClient } = require("./prisma/generated/client");
const { neon } = require('@neondatabase/serverless');
const { PrismaNeonHTTP } = require('@prisma/adapter-neon');

console.log("DATABASE_URL INSIDE DB.JS:", process.env.DATABASE_URL);

const adapter = new PrismaNeonHTTP(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;