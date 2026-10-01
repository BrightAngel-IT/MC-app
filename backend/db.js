const dotenv = require("dotenv");
const { PrismaClient } = require("./prisma/generated/client");

dotenv.config();
const prisma = new PrismaClient();

module.exports = prisma;