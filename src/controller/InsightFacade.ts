import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";
import * as fs from "fs";
import JSZip from "jszip";
import {IElement} from "./interface/IElement";
import {ISection} from "./interface/ISection";


// Returns true if a section is valid
export function validSection(sectionObj: any): boolean {
	return sectionObj.subject != null && sectionObj.course != null && sectionObj.avg != null &&
		sectionObj.professor != null && sectionObj.title != null && sectionObj.pass != null &&
		sectionObj.fail != null && sectionObj.audit != null && sectionObj.id != null &&
		sectionObj.year != null;
}

async function parseSectionObj(sectionObj: any): Promise<ISection> {
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
	return Promise.resolve(section);

}

// Parses a JSON file containing course sections into an array of ISections
export async function parseFileContent(fileContent: string): Promise<ISection[]> {
	let object = JSON.parse(fileContent);
	object = object.result;
	// return if valid or not
	const promises: any[] = [];
	object.forEach((sectionObj: any) => {
		// add section to sections, if it is valid
		if (validSection(sectionObj)) {
			promises.push(parseSectionObj(sectionObj));
		}
	});
	return Promise.all(promises);
}

export async function writeCourseSections(courseSections: ISection[], filePath: string): Promise<void> {
	await fs.writeFile(filePath,
		JSON.stringify(courseSections),
		() => 0);
	return Promise.resolve();
}

export function getKeys(datasets: Map<string, IElement>) {
	const keys: string[] = [];
	datasets.forEach((value: IElement, key: string) => {
		keys.push(key);
	});
	return keys;
}

// parse file and write to path
export async function parseFile(file: JSZip.JSZipObject, filePath: string): Promise<ISection[]> {
	return file.async("string").then(async (fileContent) => {
		// parse file's contents
		// lowercase string for robust key handling
		let courseSections: ISection[] = [];
		return parseFileContent(fileContent.toLocaleLowerCase()).then((awaited) => {
			courseSections = courseSections.concat(awaited);
			if (awaited.length > 0) {
				writeCourseSections(courseSections, filePath);
			}
			return Promise.all<ISection[]>(courseSections);
		});
	});
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
		} else if (id.search("[^\\t\\r\\n\\v\\f ]+") > -1) {
			const datasetPath = "./data/" + id;

			// create directory for this dataset's json files
			fs.mkdirSync(datasetPath + "/courses", {recursive: true});

			// parse zip contents and write to disk
			let jsZip = new JSZip();
			return jsZip.loadAsync(content, {base64: true})
				.then((loadedZip) => {
					let folderZip = loadedZip.folder("courses");
					if (folderZip != null) {
						let promisedSections: any[] = []; // need to somehow fix it so length is not 0 >:(
						folderZip.forEach(async function (relativePath, file) {
							promisedSections = promisedSections.concat(parseFile(file,
								datasetPath + relativePath + ".json"));
						});

						return Promise.all(promisedSections).then((awaitedSections) => {
							if (awaitedSections.length === 0) {
								const error = new InsightError("The dataset did not contain any valid sections");
								return Promise.reject(error);
							} else {
								this.datasets.set(id, {
									sections: awaitedSections,
									info: {
										id: id,
										kind: InsightDatasetKind.Courses,
										numRows: awaitedSections.length
									}
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
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
