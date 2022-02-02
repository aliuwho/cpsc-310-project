import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private mySet: Set<string>;

	constructor() {
		this.mySet = new Set<string>();
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
		if (id.search("_+") > -1) {
			return Promise.reject(new InsightError("The dataset contained underscore(s)"));
		} else if (id.search("[^\\t\\r\\n\\v\\f]+") > -1) {

			// try {
			// 	fs.mkdir("./data", function () {
			// 		let testZip = new JSZip();
			// 		return testZip
			// 			.loadAsync(content, {base64: true})
			// 			.then(function (zip) {
			// 				fs.mkdir("./data/" + id, (err) => {
			// 					fs.mkdir("./data/" + id + "/courses", (err2) => {
			// 						zip.forEach((relativePath, file) => {
			// 							if (!file.dir) {
			// 								// todo check for valid section etc
			// 								file.async("string").then((fileContents) => {
			// 									// todo figure out how to parse string into what we want
			// 									let jsonContent = JSON.parse(fileContents);
			// 									const data = {
			// 										title: jsonContent.Title,
			// 										id: jsonContent.id,
			// 										instructor: jsonContent.Professor,
			// 										audit: jsonContent.Audit,
			// 										year: jsonContent.Year,
			// 										pass: jsonContent.Pass,
			// 										fail: jsonContent.Fail,
			// 										avg: jsonContent.Avg,
			// 										subject: jsonContent.Subject,
			// 										uuid: jsonContent.id + jsonContent.Year + jsonContent.isntructor
			// 									};
			// 									fs.writeFile(
			// 										relativePath + ".json",
			// 										fileContents,
			// 										{encoding: "base64"},
			// 										function () {
			// 											console.log(fileContents);
			// 										}
			// 									);
			// 								});
			//
			// 							}
			//
			// 						});
			// 					});
			// 				});
			// 			});
			// 	});
			//
			// } catch (error) {
			// 	return Promise.reject(InsightError);
			// }

			return Promise.resolve([id]);
		} else {
			return Promise.reject(new InsightError("The dataset contained only whitespace or underscore chars"));
		}
	}

	public removeDataset(id: string):
		Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown):
		Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
