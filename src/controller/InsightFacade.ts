import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import * as fs from "fs";
import JSZip from "jszip";
import {IElement} from "./interface/IElement";
import {ISection} from "./interface/ISection";


// Returns true if a section is valid
function validSection(sectionObj: any): boolean {
	return sectionObj.subject != null && sectionObj.course != null && sectionObj.avg != null &&
		sectionObj.professor != null && sectionObj.title != null && sectionObj.pass != null &&
		sectionObj.fail != null && sectionObj.audit != null && sectionObj.id != null &&
		sectionObj.year != null;
}


// Parses a JSON file containing course sections into an array of ISections
function parseFile(fileContent: string, courseSections: ISection[], datasetSections: ISection[]): ISection[] {
	let object = JSON.parse(fileContent);
	object = object.result;
	let ret: ISection[] = object.forEach((sectionObj: any) => {
		// add section to sections, if it is valid
		if (validSection(sectionObj)) {
			// create ISection from fileContent
			const section: ISection = {
				dept: sectionObj.subject,
				id: sectionObj.course,
				avg: sectionObj.avg,
				instructor: sectionObj.professor,
				title: sectionObj.title,
				pass: sectionObj.pass,
				fail: sectionObj.fail,
				audit: sectionObj.audit,
				uuid: sectionObj.id,
				year: sectionObj.year
			};
			// remove this from the function
			courseSections.push(section);
			datasetSections.push(section);
		}
	}).then(() =>
		courseSections);
	// return if valid or not
	return ret;
}

function writeCourseSections(courseSections: ISection[], datasetPath: string, relativePath: string): void {
	// if (courseSections.length > 0) {
	fs.writeFile(datasetPath + relativePath + ".json",
		JSON.stringify(courseSections),
		() => 0);
	console.log(JSON.stringify(courseSections));
	// }
}

function getKeys(datasets: Map<string, IElement>) {
	const keys: string[] = [];
	datasets.forEach((value: IElement, key: string) => {
		keys.push(key);
	});
	return keys;
}

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
		} else if (id.search("[^\\t\\r\\n\\v\\f]+") > -1) {
			const datasetPath = "./data/" + id;
			const datasetSections: ISection[] = [];
			let testZip = new JSZip();

			// create directory for this dataset's json files
			fs.mkdirSync(datasetPath + "/courses", {recursive: true});

			// parse zip contents and write to disk
			return testZip.loadAsync(content, {base64: true})
				.then((zip) => {
					const courseSections: ISection[] = [];
					// parse each file in the zip
					// need to change to a map
					// map means we need to return an array of values
					// what values do we want to return?
					// after which, should we iterate through and push them to the total dataset?
					zip.forEach((relativePath, file) => {
						if (!file.dir) {
							file.async("string")
								.then((fileContent) => {
									// parse file
									// lowercase string for robust key handling
									let temp = parseFile(fileContent.toLocaleLowerCase(),
										courseSections,
										datasetSections);

									// write contents of this course's sections to disk
									writeCourseSections(temp, datasetPath, relativePath);
								});
						}
					});

					// if (datasetSections.length === 0) {
					// 	// case where no valid sections were found
					// 	return Promise.reject(new InsightError("The file did not contain any valid sections"));
					// } else {
					// create IElement to add to this.datasets
					this.datasets.set(id, {
						sections: datasetSections,
						info: {
							id: id,
							kind: InsightDatasetKind.Courses,
							numRows: datasetSections.length
						}
					});
					// grab keys and return
					let keys = getKeys(this.datasets);
					return Promise.resolve(keys);
					// }
				});
		} else {
			return Promise.reject(new InsightError("The dataset contained only whitespace"));
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
