import { Router } from "express";
import { login, signup } from "../controllers/auth";
import { errorHandler } from "../error-handler";

const authRoutes: Router = Router();

authRoutes.post("/signup", errorHandler(signup));
authRoutes.post("/login", errorHandler(login));

export default authRoutes;
