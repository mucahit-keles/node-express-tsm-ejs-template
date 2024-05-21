import { Request, Response, NextFunction } from "express";

export function indexRoute(req: Request, res: Response, next: NextFunction): void {
	return res.render("index", { title: "node-express-tsm-ejs-template" });
}