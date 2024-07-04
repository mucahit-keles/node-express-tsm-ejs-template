import express from "express";
import { Express, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import multer from "multer";
import cookieParser from "cookie-parser";
import cors from "cors";
import { dirname, join as joinPath } from "node:path";
import { fileURLToPath } from "node:url";
const nodeEnv: string = process.env.NODE_ENV || "development";

/* frontend routes */
import { indexRoute as index_frontend } from "./routes/frontend/index.js";

// for form file uploads
const upload: multer.Multer = multer({ dest: "uploads/" });

const __filedir: string = fileURLToPath(import.meta.url);
const __dirname: string = dirname(__filedir);

const app: Express = express();

/* for parsing application/json and application/xwww-form-urlencoded */
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

/* make the contents of the public folder statically accessible */
app.use(express.static(joinPath(__dirname, "..", "public")));

/* view engine */
app.set("view engine", "ejs");
app.set("views", joinPath(__dirname, "views"));

/* express modules */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(joinPath(__dirname, "public")));
app.use(cookieParser());

/* frontend routes */
app.get("/", index_frontend);

/* 404 not found handler */
app.use((req: Request, res: Response, next: NextFunction): void => {
	return res.status(404).render("404");
});

/* body-parser error handler */
app.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
	return res.status(500).render("error", { error: nodeEnv === "development" ? error.message : "Please try again." });
});

app.listen(8000);
console.log("Listening on port 8000");
