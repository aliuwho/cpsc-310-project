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
import {existsSync, readdirSync, readFileSync, rmSync} from "fs";
import JSZip from "jszip";
import {IElement} from "./interface/IElement";
import {parseAndWriteHtmlFile} from "./utility/IRoomParse";
import {parseJsonFile} from "./utility/IParse";
import {IPerformQuery} from "./utility/IPerformQuery";
import {hasUnderscore, nonWhitespace, orderResults} from "./utility/IValidate";
import {
	applyRulesToGroup,
	createGroupsFromKinds,
	createResultsWithSpecifiedFields,
	getDatasets,
	getKeys,
	selectFieldsFromResult,
	writeDatasetToJson,
} from "./utility/IUtility";
import {IQueryValidator} from "./utility/IQueryValidator";
import {IRoom, ISection} from "./interface/IKind";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	protected datasets: Map<string, IElement>;

	constructor() {
		this.datasets = new Map();
		this.loadDataOnFacadeDataset();
		console.log("InsightFacadeImpl::init()");
	}

	private loadDataOnFacadeDataset() {
		const basicDir = "./data";
		if (existsSync(basicDir)) {
			// read from the courses folder
			if (existsSync(basicDir + "/courses")) {
				const dataNames = readdirSync(basicDir + "/courses");
				for (const dataName of dataNames) {
					const dataNameId = dataName.replace(".json", "");
					const fullJsonFileName = basicDir + "/courses/" + dataName;
					const datasetJsonFile = readFileSync(fullJsonFileName, {encoding: "utf8", flag: "r"});
					const iKindArray = JSON.parse(datasetJsonFile);
					this.datasets.set(dataNameId, {
						kinds: iKindArray as ISection[],
						info: {
							id: dataNameId,
							kind: InsightDatasetKind.Courses,
							numRows: iKindArray.length,
						},
					});
				}
			}

			// read from the rooms folder
			if (existsSync(basicDir + "/rooms")) {
				const dataNames = readdirSync(basicDir + "/rooms");
				for (const dataName of dataNames) {
					const fullJsonFileName = basicDir + "/rooms/" + dataName;
					const datasetJsonFile = readFileSync(fullJsonFileName, {encoding: "utf8", flag: "r"});
					const iKindArray = JSON.parse(datasetJsonFile);
					this.datasets.set(dataName, {
						kinds: iKindArray as IRoom[],
						info: {
							id: dataName.replace(".json", ""),
							kind: InsightDatasetKind.Rooms,
							numRows: iKindArray.length,
						},
					});
				}
			}
		}
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
		} else if (hasUnderscore(id)) {
			return Promise.reject(new InsightError("The dataset contained underscore(s)"));
		} else if (nonWhitespace(id)) {
			const datasetPath = "./data/" + kind + "/" + id + ".json";

			// parse zip contents and write to disk and memory
			let jsZip = new JSZip();
			const loadedZip = await jsZip.loadAsync(content, {base64: true});
			// !!! catch error for invalid ZIP file
			const dataFolder = loadedZip.folder(kind);
			if (dataFolder != null && typeof dataFolder !== "undefined") {
				if (dataFolder.length <= 0) {
					return Promise.reject(new InsightError("The dataset did not contain any valid items"));
				}
				if (kind === InsightDatasetKind.Courses) {
					return this.addCourseDataset(datasetPath, loadedZip, id);
				} else if (kind === InsightDatasetKind.Rooms) {
					return this.addRoomDataset(datasetPath, loadedZip, id);
				} else {
					return Promise.reject(new InsightError("Invalid dataset kind"));
				}
			} else {
				return Promise.reject(new InsightError("The dataset did not contain a " + kind + " folder"));
			}
		} else {
			return Promise.reject(new InsightError("The dataset contained only whitespace"));
		}
	}

	private addRoomDataset(datasetPath: string, loadedZip: JSZip, id: string): Promise<string[]> {
		// Access the files
		let folderZip = loadedZip.folder("rooms");
		let indexHtm = folderZip?.file("index.htm");

		// Rejects if index.htm does not exist
		if (indexHtm === null) {
			throw new InsightError("index.htm file does not exist");
		}

		// Convert index.htm to string and parse index.htm file
		return parseAndWriteHtmlFile(indexHtm, folderZip).then((awaitedRooms) => {
			// process promised sections into disk and memory
			if (awaitedRooms.length === 0) {
				const error = new InsightError("The dataset did not contain any valid rooms");
				return Promise.reject(error);
			} else {
				// create directory for this dataset's json files
				fs.mkdirSync("./data/rooms", {recursive: true});
				writeDatasetToJson(awaitedRooms, datasetPath);
				this.datasets.set(id, {
					kinds: awaitedRooms,
					info: {
						id: id,
						kind: InsightDatasetKind.Rooms,
						numRows: awaitedRooms.length,
					},
				});
				// grab keys and return
				let keys = getKeys(this.datasets);
				return Promise.resolve<string[]>(keys);
			}
		});
	}

	private addCourseDataset(datasetPath: string, loadedZip: JSZip, id: string): Promise<string[]> {
		// parse the files in the zip under the courses directory
		let folderZip = loadedZip.folder("courses");
		let promisedSections: any[] = [];
		folderZip?.forEach(function (relativePath, file) {
			let sections = parseJsonFile(file);
			promisedSections = promisedSections.concat(sections);
		});
		// process promised sections into disk and memory
		return Promise.all(promisedSections).then((awaitedSections) => {
			awaitedSections = awaitedSections.flat(1);
			if (awaitedSections.length === 0) {
				const error = new InsightError("The dataset did not contain any valid sections");
				return Promise.reject(error);
			} else {
				// Write the awaitedSections onto the disk
				// create directory for this dataset's json files
				fs.mkdirSync("./data/courses", {recursive: true});
				writeDatasetToJson(awaitedSections, datasetPath);
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
		if (hasUnderscore(id)) {
			return Promise.reject(new InsightError("The dataset contained underscore(s)"));
		} else if (nonWhitespace(id)) {
			let dataset = this.datasets.get(id);
			if (dataset) {
				const datasetKind = dataset.info.kind;
				rmSync("./data/" + datasetKind + "/" + id + ".json");
			}
			if (this.datasets.delete(id)) {
				return Promise.resolve(id);
			} else {
				return Promise.reject(new NotFoundError("The dataset " + id + " was not found"));
			}
		} else {
			return Promise.reject(new InsightError("The dataset contained only whitespace"));
		}
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise((resolve, reject) => {
			if (!(query instanceof Object)) {
				// Reject if invalid type
				reject(new InsightError("Invalid query string: Invalid JSON"));
			}

			// Check if query is valid and initialize fields
			const tempQuery: any = query; // to have access to the keys
			let validator = new IQueryValidator(query, this.datasets);

			// Get resulting kinds for query
			let iPerformQuery = new IPerformQuery(validator.getDataset().kinds, tempQuery);
			let filteredKinds = iPerformQuery.getFilteredKinds();

			// Perform aggregation (if applicable) and create InsightResults with specified fields
			let results: InsightResult[] = [];
			let columnsArray = validator.getColumnsArray();
			if (validator.hasTransform) {
				let groupKeys = validator.getGroupKeys();
				let groups = createGroupsFromKinds(filteredKinds, groupKeys);

				// Aggregate results
				let applyResults: InsightResult[] = [];
				for (const group of groups.values()) {
					let applyResult = applyRulesToGroup(group, groupKeys, validator.getApplyRules());
					applyResults.push(applyResult);
				}

				// Turn into results with specified columns fields
				for (const result of applyResults) {
					results.push(selectFieldsFromResult(result, columnsArray));
				}
			} else {
				if (filteredKinds.length > 5000) {
					throw new ResultTooLargeError("The result is too big (>5000 results)");
				}
				results = createResultsWithSpecifiedFields(filteredKinds, validator.getColumnsArray());
			}

			// Order results
			let orderedResults = orderResults(results, validator.getOrderKeys(), validator.getDir());
			if (orderedResults.length > 5000) {
				throw new ResultTooLargeError("The result is too big (>5000 results)");
			}
			resolve(orderedResults);
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(getDatasets(this.datasets));
	}
}
