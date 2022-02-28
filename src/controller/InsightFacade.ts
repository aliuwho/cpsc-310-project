import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import * as fs from "fs";
import * as fse from "fs-extra";
import JSZip from "jszip";
import {IElement} from "./interface/IElement";
import {getDatasets, getKeys} from "./utility/IUtility";
import {parseAndWriteJsonFile} from "./utility/IParse";
import {IPerformQuery} from "./utility/IPerformQuery";
import {IKind} from "./interface/IKind";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	protected datasets: Map<string, IElement>;

	constructor() {
		this.datasets = new Map();
		console.log("InsightFacadeImpl::init()");
	}

	/**
	 * The promise should fulfill on a successful add, reject for any failures.
	 * The promise should fulfill with a string array,
	 * containing the ids of all currently added datasets upon a successful add.
	 * The promise should reject with an InsightError describing the error.
	 *
	 * An id is invalid if it contains an underscore, or is only whitespace characters.
	 * If id is the same as the id of an already added dataset, the dataset should be rejected and not saved.
	 *
	 * After receiving the dataset, it should be processed into a data structure of
	 * your design. The processed data structure should be persisted to disk; your
	 * system should be able to load this persisted value into memory for answering
	 * queries.
	 *
	 * Ultimately, a dataset must be added or loaded from disk before queries can
	 * be successfully answered.
	 * @param id
	 * @param content
	 * @param kind
	 */
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (this.datasets.has(id)) {
			return Promise.reject(new InsightError("The dataset already exists"));
		} else if (id.search("_+") > -1) {
			return Promise.reject(new InsightError("The dataset contained underscore(s)"));
		} else if (id.search("[^\\t\\r\\n\\v\\f ]+") > -1) {
			const datasetPath = "./data/" + id;

			// parse zip contents and write to disk and memory
			let jsZip = new JSZip();
			const loadedZip = await jsZip.loadAsync(content, {base64: true});

			if (loadedZip.folder(/courses/).length > 0) {
				return this.addCourseDataset(datasetPath, loadedZip, id);
			} else if (loadedZip.folder(/rooms/).length > 0) {
				return this.addRoomDataset(datasetPath, loadedZip, id);
			} else {
				return Promise.reject(new InsightError("The dataset did not contain a courses folder"));
			}
		} else {
			return Promise.reject(new InsightError("The dataset contained only whitespace"));
		}
	}

	private addRoomDataset(datasetPath: string, loadedZip: JSZip, id: string): Promise<string[]> {
		// create directory for this dataset's json files
		fs.mkdirSync(datasetPath + "/rooms", {recursive: true});

		// Access the files
		let folderZip = loadedZip.folder("rooms");
		let indexHtm = folderZip?.file("index.htm");

		// Rejects if index.htm does not exist
		if (indexHtm === null) {
			throw new InsightError("index.htm file does not exist");
		}

		// parse the files in the zip under the courses directory
		let promisedSections: any[] = [];
		// folderZip?.forEach(function (relativePath, file) {
		// 	let sections = parseAndWriteJsonFile(file, datasetPath + "/courses/" + relativePath + ".json");
		// 	promisedSections = promisedSections.concat(sections);
		// });
		// process promised sections into disk and memory
		return Promise.all(promisedSections).then((awaitedSections) => {
			awaitedSections = awaitedSections.reduce((accumulator, value) => accumulator.concat(value), []);
			if (awaitedSections.length === 0) {
				fse.removeSync(datasetPath); // remove the dir we created
				const error = new InsightError("The dataset did not contain any valid sections");
				return Promise.reject(error);
			} else {
				this.datasets.set(id, {
					kinds: awaitedSections,
					info: {
						id: id,
						kind: InsightDatasetKind.Rooms,
						numRows: awaitedSections.length,
					},
				});
				// grab keys and return
				let keys = getKeys(this.datasets);
				return Promise.resolve<string[]>(keys);
			}
		});
	}

	private addCourseDataset(datasetPath: string, loadedZip: JSZip, id: string): Promise<string[]> {
		// create directory for this dataset's json files
		fs.mkdirSync(datasetPath + "/courses", {recursive: true});
		let folderZip = loadedZip.folder("courses");

		// parse the files in the zip under the courses directory
		let promisedSections: any[] = [];
		folderZip?.forEach(function (relativePath, file) {
			let sections = parseAndWriteJsonFile(file, datasetPath + "/courses/" + relativePath + ".json");
			promisedSections = promisedSections.concat(sections);
		});
		// process promised sections into disk and memory
		return Promise.all(promisedSections).then((awaitedSections) => {
			awaitedSections = awaitedSections.reduce((accumulator, value) => accumulator.concat(value), []);
			if (awaitedSections.length === 0) {
				fse.removeSync(datasetPath); // remove the dir we created
				const error = new InsightError("The dataset did not contain any valid sections");
				return Promise.reject(error);
			} else {
				this.datasets.set(id, {
					kinds: awaitedSections,
					info: {
						id: id,
						kind: InsightDatasetKind.Courses,
						numRows: awaitedSections.length,
					},
				});
				// grab keys and return
				let keys = getKeys(this.datasets);
				return Promise.resolve<string[]>(keys);
			}
		});
	}

	public removeDataset(id: string): Promise<string> {
		if (id.search("_+") > -1) {
			return Promise.reject(new InsightError("The dataset contained underscore(s)"));
		} else if (id.search("[^\\t\\r\\n\\v\\f ]+") > -1) {
			if (this.datasets.delete(id)) {
				return Promise.resolve(id);
			} else {
				return Promise.reject(new NotFoundError("The dataset was not found"));
			}
		} else {
			return Promise.reject(new InsightError("The dataset contained only whitespace"));
		}
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		let performQueryTemp = new IPerformQuery(this.datasets);
		let results: InsightResult[] = [];
		return new Promise((resolve, reject) => {
			if (!(query instanceof Object)) {
				// Reject if invalid type
				throw new InsightError("Invalid query string: Invalid JSON");
			}
			const tempQuery: any = query; // to have access to the keys

			if (!(tempQuery["WHERE"])) {
				// Reject if no WHERE block
				throw new InsightError("Missing WHERE");
			}

			if (!(tempQuery["OPTIONS"])) {
				// Reject if no OPTIONS block
				throw new InsightError("Missing OPTIONS");
			}

			const whereBlock = tempQuery["WHERE"];
			const optionBlock = tempQuery["OPTIONS"];
			let filteredSections: IKind[] = [];
			// WHERE block manipulation
			if (Object.keys(whereBlock).length > 0) {
				performQueryTemp.checkObjectLength(whereBlock, "WHERE");
				filteredSections = performQueryTemp.mainWhereFilter(whereBlock);
			}
			// OPTIONS block manipulation
			if (!(optionBlock["COLUMNS"])) {
				// Reject if no COLUMNS block
				throw new InsightError("OPTIONS missing COLUMNS");
			}
			const columnArray = optionBlock["COLUMNS"];
			const orderField = optionBlock["ORDER"];
			if (columnArray.length <= 0 || !(Array.isArray(columnArray))) {
				// Reject if no COLUMN array is empty
				throw new InsightError("COLUMNS must be a non-empty array");
			}
			// Check if WHERE block has filters, if not return the whole section array in the specified ZIP
			filteredSections = performQueryTemp.checkIfWhereBlockHasFiltered(filteredSections, columnArray[0]);

			for (let section of filteredSections) {
				// Go through every filteredSection to select specified values
				let resultElementToBeAdded: any = {};
				for (let columnName of columnArray) {
					resultElementToBeAdded = performQueryTemp.createFieldInResultElementToBeAdded(columnName,
						resultElementToBeAdded, section);
				}
				// Add resultElementToBeAdded into results array
				results.push(resultElementToBeAdded);
			}
			if (results.length > 5000) {
				return reject(new ResultTooLargeError("The result is too big (>5000 results)"));
			}
			results = performQueryTemp.orderFunction(orderField, columnArray, results);
			resolve(results);
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(getDatasets(this.datasets));
	}
}

