import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import * as fs from "fs";
import JSZip from "jszip";
import {IElement} from "./interface/IElement";
import {getDatasets, getKeys} from "./utility/IUtility";
import {parseFile} from "./utility/IParse";

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
	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (this.datasets.has(id)) {
			return Promise.reject(new InsightError("The dataset already exists"));
		} else if (id.search("_+") > -1) {
			return Promise.reject(new InsightError("The dataset contained underscore(s)"));
		} else if (id.search("[^\\t\\r\\n\\v\\f ]+") > -1) {
			const datasetPath = "./data/" + id;

			// create directory for this dataset's json files
			fs.mkdirSync(datasetPath + "/courses", {recursive: true});

			// parse zip contents and write to disk and memory
			let jsZip = new JSZip();
			return jsZip.loadAsync(content, {base64: true}).then((loadedZip) => {
				let folderZip = loadedZip.folder("courses");
				if (folderZip != null) {
					// parse the files in the zip under the courses directory
					let promisedSections: any[] = [];
					folderZip.forEach(async function (relativePath, file) {
						let sections = parseFile(file, datasetPath + "/courses/" + relativePath + ".json");
						promisedSections = promisedSections.concat(sections);
					});
					// process promised sections into disk and memory
					return Promise.all(promisedSections).then((awaitedSections) => {
						awaitedSections = awaitedSections.reduce((accumulator, value) => accumulator.concat(value), []);
						if (awaitedSections.length === 0) {
							const error = new InsightError("The dataset did not contain any valid sections");
							return Promise.reject(error);
						} else {
							this.datasets.set(id, {
								sections: awaitedSections,
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
			});
		} else {
			return Promise.reject(new InsightError("The dataset contained only whitespace"));
		}
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
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(getDatasets(this.datasets));
	}
}
