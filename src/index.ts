import express, { Request, Response, Express } from "express";
import { PORT } from "./secrets";
import rootRouter from "./routes";
import { PrismaClient } from "@prisma/client";
import { errorMiddleware } from "./middlewares/errors";
import helmet from "helmet";
import toobusy from "toobusy-js";
import cors from "cors";

const app: Express = express();

app.use(express.json());

app.use(cors());

app.use(helmet());

app.use(function (req, res, next) {
  if (toobusy()) {
    res.send(503);
  } else {
    next();
  }
});

app.use("/api", rootRouter);

export const prismaClient = new PrismaClient({
  log: ["query"],
}).$extends({
  result: {
    address: {
      formattedAddress: {
        needs: {
          cep: true,
          city: true,
          state: true,
          country: true,
        },
        compute: (address) => {
          return `${address.city}, ${address.state}, ${address.country} - ${address.cep}`;
        },
      },
    },
  },
});

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log("Listening on port 3000");
});
