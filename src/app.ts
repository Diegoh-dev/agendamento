import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { routes } from "./routes/index.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/api", routes);
app.use(errorMiddleware);

export { app };
