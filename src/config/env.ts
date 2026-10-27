import "dotenv/config";

export const env = {
  port: Number(process.env.PORT) || 3000,
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: Number(process.env.DB_PORT) || 3306,
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD ?? "root",
  dbName: process.env.DB_NAME || "agendamento",
};
