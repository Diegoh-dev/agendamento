import { defineConfig } from "vitest/config";

export const TEST_DB_NAME = "agendamento_test";

export default defineConfig({
  test: {
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 30000,
    env: { DB_NAME: TEST_DB_NAME },
    globalSetup: ["./tests/global-setup.ts"],
  },
});
