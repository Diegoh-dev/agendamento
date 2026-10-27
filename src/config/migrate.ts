import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "./env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate(): Promise<void> {
  const connection = await mysql.createConnection({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    multipleStatements: true,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.dbName}\``);
    await connection.query(`USE \`${env.dbName}\``);

    const schemaPath = path.resolve(__dirname, "../../database/schema.sql");
    const schema = await readFile(schemaPath, "utf8");
    await connection.query(schema);

    console.log(`Database ${env.dbName} ready`);
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
