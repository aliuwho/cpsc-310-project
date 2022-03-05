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
import {parseAndWriteJsonFile} from "./utility/IParse";
import {IPerformQuery} from "./utility/IPerformQuery";
import {hasUnderscore, nonWhitespace, orderResults} from "./utility/IValidate";
import {
	applyRulesToGroup,
	createGroupsFromKinds,
	createResultsWithSpecifiedFields,
	getDatasets,
	getKeys,
	selectFieldsFromResult,
} from "./utility/IUtility";
import {IQueryValidator} from "./utility/IQueryValidator";

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
		} else if (hasUnderscore(id)) {
			return Promise.reject(new InsightError("The dataset contained underscore(s)"));
		} else if (nonWhitespace(id)) {
			const datasetPath = "./data/" + id;

			// create directory for this dataset's json files
			fs.mkdirSync(datasetPath + "/courses", {recursive: true});

			// parse zip contents and write to disk and memory
			let jsZip = new JSZip();
			const loadedZip = await jsZip.loadAsync(content, {base64: true});
			let folderZip = loadedZip.folder("courses");
			if (folderZip != null) {
				// parse the files in the zip under the courses directory
				let promisedSections: any[] = [];
				folderZip.forEach(function (relativePath, file) {
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
			} else {
				return Promise.reject(new InsightError("The dataset did not contain a courses folder"));
			}
		} else {
			return Promise.reject(new InsightError("The dataset contained only whitespace"));
		}
	}

	public removeDataset(id: string): Promise<string> {
		if (hasUnderscore(id)) {
			return Promise.reject(new InsightError("The dataset contained underscore(s)"));
		} else if (nonWhitespace(id)) {
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
		return new Promise((resolve, reject) => {
			if (!(query instanceof Object)) {
				// Reject if invalid type
				reject(new InsightError("Invalid query string: Invalid JSON"));
			}

			// Check if query is valid and initialize fields
			const tempQuery: any = query; // to have access to the keys
			let validator = new IQueryValidator(query);
			let dataset = this.datasets.get(validator.getDatasetName());
			if (!dataset) {
				throw new InsightError("Referenced dataset " + validator.getDatasetName() + " not added yet ");
			}

			// Get resulting kinds for query
			let iPerformQuery = new IPerformQuery(dataset.kinds, tempQuery);
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
