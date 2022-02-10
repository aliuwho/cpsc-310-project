import {ISection} from "../interface/ISection";
import {InsightError, InsightResult} from "../IInsightFacade";
import {IElement} from "../interface/IElement";

export class IPerformQuery {
	protected unchangedSections: ISection[];
	protected originalDataset;
	protected datasets: Map<string, IElement>;

	constructor(datasetParam: Map<string, IElement>) {
		this.datasets = datasetParam;
		this.unchangedSections = [];
		this.originalDataset = "";
	}

	public mainWhereFilter(filterBlock: any, sectionArray: ISection[]): ISection[] {
		// May need to instantiate a new variable to return (resultFilteredSections)
		if (filterBlock["OR"] || filterBlock["AND"]) {
			if (filterBlock["OR"]) {
				const orBlock = filterBlock["OR"];
				let orCollatedSections: ISection[] = [];
				if (orBlock.length > 0) {
					for (let filter of orBlock) {
						let oneFilteredSectionArray = this.mainWhereFilter(filter, this.unchangedSections);
						orCollatedSections = orCollatedSections.concat(oneFilteredSectionArray);
					}
				} else {
					// Reject empty "OR" block array
					throw new InsightError("OR must be a non-empty array");
				}
				sectionArray = this.arrayUnique(orCollatedSections);
				// // Clear orCollatedSections for next query
				// orCollatedSections = [];
			} else {
				const andBlock = filterBlock["AND"];
				if (andBlock.length > 0) {
					for (let filter of andBlock) {
						sectionArray = this.mainWhereFilter(filter, sectionArray);
					}
				} else {
					// Reject empty "OR" block array
					throw new InsightError("OR must be a non-empty array");
				}
			}
		} else if (filterBlock["LT"] || filterBlock["EQ"] || filterBlock["GT"]) {
			// M Comparison
			sectionArray = this.mComparison(filterBlock, sectionArray);
		} else if (filterBlock["IS"]) {
			// S Comparison
			sectionArray = this.sComparison(filterBlock, sectionArray);

		} else if (filterBlock["NOT"]) {
			// Negation
			const negBlock = filterBlock["NOT"];
			this.checkObjectLength(negBlock, "NOT");
			let toBeExcludedSectionArray = this.mainWhereFilter(negBlock, sectionArray);
			// Remove the originally filtered sections in NegBlock content (for negation):
			// https://stackoverflow.com/questions/19957348/remove-all-elements-contained-in-another-array
			sectionArray = this.unchangedSections.filter((section) => {
				return !toBeExcludedSectionArray.includes(section);
			});
		} else {
			// Reject if invalid key
			throw new InsightError("Invalid key");
		}
		return sectionArray;
	}

	// To make a unique array: https://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
	public arrayUnique(sectionArray: ISection[]): ISection[] {
		let tempArray = sectionArray.concat();
		for (let i = 0; i < tempArray.length; ++i) {
			for (let j = i + 1; j < tempArray.length; ++j) {
				if (tempArray[i] === tempArray[j]) {
					tempArray.splice(j--, 1);
				}
			}
		}
		return tempArray;
	}

	public sComparison(filterBlock: any, sectionArray: ISection[]): ISection[] {
		const sComBlock = filterBlock["IS"];
		this.checkObjectLength(sComBlock, "IS");
		// Getting individual values
		const filterKey = Object.keys(sComBlock);
		const filterKeyString = filterKey[0];
		const splitKey = filterKeyString.split("_");
		const specificFieldKey = splitKey[1]; // one out of nine field keys
		const filterValue = sComBlock[filterKeyString]; // field value
		this.setOriginalDatasetAndCheckDataset(filterKeyString);

		console.log(filterValue + " is type " + typeof filterValue);

		if(!(specificFieldKey === "dept" || specificFieldKey === "id" || specificFieldKey === "instructor" ||
			specificFieldKey === "title" || specificFieldKey === "uuid")) {
			// Reject if field is not a MField
			throw new InsightError(specificFieldKey + " is not a MField");
		}

		if (!(typeof filterValue === "string")) {
			// Reject if SComparison value is not a string
			throw new InsightError("SComparison Value is not a string");
		}

		if (sectionArray.length === 0) {
			// New sectionArray
			sectionArray = this.unchangedSections.filter((section: any) => {
				return section[specificFieldKey] === filterValue;
			});
		} else {
			// existing sectionArray (for OR/AND case)
			sectionArray = sectionArray.filter((section: any) => {
				return section[specificFieldKey] === filterValue;
			});
		}
		return sectionArray;
	}

	public mComparison(filterBlock: any, sectionArray: ISection[]): ISection[] {
		let mComBlock: any = {};
		if (filterBlock["LT"]) {
			mComBlock = filterBlock["LT"];
		} else if (filterBlock["EQ"]) {
			mComBlock = filterBlock["EQ"];
		} else {
			mComBlock = filterBlock["GT"];
		}
		this.checkObjectLength(mComBlock, "MCOMPARISON");
		// Getting individual values
		const filterKey = Object.keys(mComBlock);
		const filterKeyString = filterKey[0];
		const splitKey = filterKeyString.split("_");
		const specificFieldKey = splitKey[1]; // one out of nine field keys
		const filterValue = mComBlock[filterKeyString]; // field value
		this.setOriginalDatasetAndCheckDataset(filterKeyString);

		if(!(specificFieldKey === "avg" || specificFieldKey === "pass" || specificFieldKey === "fail" ||
			specificFieldKey === "audit" || specificFieldKey === "year")) {
			// Reject if field is not a MField
			throw new InsightError(specificFieldKey + " is not a MField");
		}

		if (isNaN(filterValue)) {
			// Reject if MComparison value is not a number
			throw new InsightError("MComparison Value is not a number");
		}
		sectionArray = this.mComparisonFilter(filterBlock, sectionArray, specificFieldKey, filterValue);
		return sectionArray;
	}

	public mComparisonFilter(filterBlock: any, sectionArray: ISection[], specificFieldKey: string, filterValue: any) {
		if (sectionArray.length === 0) {
			// New sectionArray
			let index = 0;
			return this.unchangedSections.filter((section: any) => {
				if (specificFieldKey in section) {
					if (filterBlock["LT"]) {
						return section[specificFieldKey] < filterValue;
					} else if (filterBlock["EQ"]) {
						return section[specificFieldKey] === filterValue;
					} else {
						return section[specificFieldKey] > filterValue;
					}
				} else {
					// Reject if key is invalid
					throw new InsightError("Invalid key " + specificFieldKey);
				}
			});
		} else {
			// existing sectionArray (for OR/AND case)
			return sectionArray.filter((section: any) => {
				if (specificFieldKey in section) {
					if (filterBlock["LT"]) {
						return section[specificFieldKey] < filterValue;
					} else if (filterBlock["EQ"]) {
						return section[specificFieldKey] === filterValue;
					} else {
						return section[specificFieldKey] > filterValue;
					}
				} else {
					// Reject if key is invalid
					throw new InsightError("Invalid key " + specificFieldKey);
				}
			});
		}
	}

	public checkObjectLength(block: any, filterWord: string): void {
		const objectLength = Object.keys(block).length;
		if (objectLength !== 1) {
			throw new InsightError(filterWord + " should only have 1 key, has " + objectLength);
		}
	}

	public setOriginalDatasetAndCheckDataset(filterKeyString: string): void {
		if ((filterKeyString.match(/_/g) || []).length !== 1) {
			// Reject if filterKey has illegal "_"
			throw new InsightError("Invalid key " + filterKeyString);
		} else {
			const splitKey = filterKeyString.split("_");
			const datasetName = splitKey[0];
			if (this.originalDataset === "") {
				// Set global variables: original dataset name for comparison & set of filtered sections
				this.originalDataset = datasetName;
				const originalIElement = this.datasets.get(this.originalDataset);
				if (originalIElement) {
					this.unchangedSections = originalIElement.sections;
				} else {
					// Reject if dataset has not been added
					throw new InsightError(this.originalDataset + " has not been added");
				}
			} else {
				this.checkIfMultipleDatasets(datasetName);
			}
		}
	}

	public checkIfMultipleDatasets(datasetName: string) {
		if (this.originalDataset !== datasetName) {
			// Reject if multiple datasets are referred
			throw new InsightError("Multiple datasets cannot be referred");
		}
	}

	public orderFunction(orderField: string, columnArray: any, results: InsightResult[]): InsightResult[] {
		// Sort by order
		let finalResults: InsightResult[] = [];
		if (orderField) {
			if (!(columnArray.includes(orderField))) {
				// Reject if Order Field does not exist in Column Array
				throw new InsightError("ORDER key must be in COLUMNS");
			}
			this.setOriginalDatasetAndCheckDataset(orderField);
			// Sort
			finalResults =  this.insertionSort(orderField, results);
		}
		return finalResults;
	}

	public insertionSort(orderField: string,  results: InsightResult[]): InsightResult[] {
		for(let i = 1; i < results.length; i++){
			let currentResultElement = results[i];
			let currentVariable = currentResultElement[orderField];
			let comparisonIndex = i - 1;
			while(comparisonIndex >= 0 && results[comparisonIndex][orderField] > currentVariable){
				results[comparisonIndex + 1] = results[comparisonIndex];
				comparisonIndex = comparisonIndex - 1;
			}
			results[comparisonIndex + 1] = currentResultElement;
		}
		return results;
	}
}
