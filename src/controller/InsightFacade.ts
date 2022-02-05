import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError
} from "./IInsightFacade";

import {IElement} from "./interface/IElement";
import {ISection} from "./interface/ISection";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	protected datasets: Map<string, IElement>;
	private originalDataset: string;

	constructor() {
		this.datasets = new Map();
		this.originalDataset = "";
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {

		return Promise.resolve(["Not implemented."]);
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		const results: InsightResult[] = [];
		return new Promise((resolve, reject) => {
			if (query instanceof Object) {
				const tempQuery: any = query; // to have access to the keys
				if (tempQuery["WHERE"] && tempQuery["OPTIONS"]) {
					const whereBlock = tempQuery["WHERE"];
					const optionBlock = tempQuery["OPTIONS"];
					let filteredSections: ISection[] = [];
					// WHERE block manipulation
					this.checkObjectLength(whereBlock);
					filteredSections = this.mainWhereFilter(whereBlock);

					if (filteredSections.length > 5000) {
						return reject(new ResultTooLargeError("The result is too big (>5000 results)"));
					}

					// OPTIONS block manipulation
					if (optionBlock["COLUMNS"]) {
						const columnArray = optionBlock["COLUMNS"];
						if (columnArray.length > 0) {
							resolve([]); // Check
						} else {
							// Reject if no COLUMN array is empty
							throw new InsightError("COLUMNS must be a non-empty array");
						}
					} else {
						// Reject if no WHERE or OPTIONS block
						throw new InsightError("OPTIONS missing COLUMNS");
					}
				} else {
					// Reject if no WHERE or OPTIONS block
					throw new InsightError("Missing WHERE");
				}
			} else {
				// Reject if invalid type
				throw new InsightError("Invalid query string: Invalid JSON");
			}
		});
	}

	private mainWhereFilter(filterBlock: any): ISection[] {
		if(filterBlock["OR"] || filterBlock["AND"]) {
			// if(filterBlock["OR"]) {
			// 	const orBlock = filterBlock["OR"];
			// 	for(let filter in orBlock){
			//
			// 	}
			// } else {
			// 	const andBlock = filterBlock["AND"];
			// 	for(let filter in andBlock){
			//
			// 	}
			// }
		} else if(filterBlock["LT"] || filterBlock["EQ"] || filterBlock["GT"]) {
			// M Comparison
			let mComBlock: any = {};
			if(filterBlock["LT"]){
				mComBlock = filterBlock["LT"];
			} else if(filterBlock["EQ"]){
				mComBlock = filterBlock["EQ"];
			} else {
				mComBlock = filterBlock["GT"];
			}
			this.checkObjectLength(mComBlock);
			this.setOriginalDataset(mComBlock);
		} else if(filterBlock["IS"]) {
			// S Comparison
			const sComBlock = filterBlock["IS"];
			this.checkObjectLength(sComBlock);
			this.setOriginalDataset(sComBlock);
		} else if(filterBlock["NOT"]) {
			// Negation
			const negBlock = filterBlock["NOT"];
			this.checkObjectLength(negBlock);
			this.setOriginalDataset(negBlock);
		} else {
			throw new InsightError();
		}
		return [];
	}

	private checkObjectLength(block: any): void {
		const objectLength = Object.keys(block).length;
		if(objectLength !== 1) {
			throw new InsightError("WHERE should only have 1 key, has " + objectLength);
		}
	}

	private setOriginalDataset(block: any): void {
		if(this.originalDataset === ""){
			const filterKey = Object.keys(block);
			const filterKeyString = filterKey[0];
			if((filterKeyString.match(/_/g) || []).length !== 1){
				throw new InsightError("Invalid key " + filterKeyString);
			} else {
				const splitKey = filterKeyString.split("_")[0];
				this.originalDataset = splitKey[0];
			}
		}
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
