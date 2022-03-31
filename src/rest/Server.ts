import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {IInsightFacade, InsightDatasetKind, NotFoundError} from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private facade: IInsightFacade;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		this.facade = new InsightFacade();

		this.registerMiddleware();
		this.registerRoutes();
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express
					.listen(this.port, () => {
						console.info(`Server::start() - server listening on port: ${this.port}`);
						resolve();
					})
					.on("error", (err: Error) => {
						// catches errors in server start
						console.error(`Server::start() - server ERROR: ${err.message}`);
						reject(err);
					});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));

		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		this.express.get("/", (req, res) => {
			res.render("index.html");
		});

		this.express.put("/dataset/:id/:kind", this.putHandler.bind(this)); // Add datasets endpoint
		this.express.post("/query", this.postHandler.bind(this)); // Perform query endpoint
		this.express.delete("/dataset/:id", this.deleteHandler.bind(this)); // Remove datasets endpoint
		this.express.get("/datasets", this.getHandler.bind(this)); // List datasets endpoint
	}

	// Responds to a put request
	private putHandler(req: Request, res: Response): void {
		const id = req.params.id;
		const kind = req.params.kind;
		const rawZip = req.body.toString("base64");
		if (kind === "courses") {
			console.log(`Server::put(..) - Courses - params: ${JSON.stringify(req.params)}`);
			this.facade
				.addDataset(id, rawZip, InsightDatasetKind.Courses)
				.then((resultArray: string[]) => {
					res.status(200).json({result: resultArray});
				})
				.catch((err) => {
					console.log(`error occurred in put (courses): ${err}`);
					res.status(400).json({error: err.message});
				});
		} else if (kind === "rooms") {
			console.log(`Server::put(..) - Kinds - params: ${JSON.stringify(req.params)}`);
			this.facade
				.addDataset(id, rawZip, InsightDatasetKind.Rooms)
				.then((resultArray: string[]) => {
					res.status(200).json({result: resultArray});
				})
				.catch((err) => {
					console.log(`error occurred in put (rooms): ${err}`);
					res.status(400).json({error: err.message});
				});
		} else {
			console.log("error occurred in put: invalid InsightDatasetKind");
			res.status(400).json({error: "Invalid InsightDatasetKind"});
		}
	}

	// Responds to a post request
	private postHandler(req: Request, res: Response): void {
		this.facade
			.performQuery(req.body)
			.then((resultArray) => {
				console.log(`Server::post(..) - params: ${JSON.stringify(req.params)}`);
				res.status(200).json({result: resultArray});
			})
			.catch((err) => {
				console.log(`error occurred in post: ${err}`);
				res.status(400).json({error: err.message});
			});
	}

	// Responds to a delete request
	private deleteHandler(req: Request, res: Response): void {
		console.log(`Server::delete(..) - params: ${JSON.stringify(req.params)}`);
		this.facade
			.removeDataset(req.params.id)
			.then((result) => {
				res.status(200).json({result: result});
			})
			.catch((err) => {
				console.log(`error occurred in delete: ${err}`);
				if (err instanceof NotFoundError) {
					res.status(404).json({error: err.message});
				} else {
					res.status(400).json({error: err.message});
				}
			});
	}

	// Responds to a get request
	private getHandler(req: Request, res: Response): void {
		console.log(`Server::get(..) - params: ${JSON.stringify(req.params)}`);
		this.facade
			.listDatasets()
			.then((resultArray) => {
				console.log(`${resultArray}`);
				res.status(200).json({result: resultArray});
			})
			.catch((err) => {
				console.log(`error occurred in get: ${err}`);
				res.status(400).json({error: err.message});
			});
	}
}
