import { execSync } from "node:child_process";
import { TEST_DB_NAME } from "../vitest.config.js";

export default function setup(): void {
  execSync("npx tsx src/config/migrate.ts", {
    stdio: "inherit",
    env: { ...process.env, DB_NAME: TEST_DB_NAME },
  });
}
