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

	public mainWhereFilter(filterBlock: any): ISection[] {
		let finalResult: ISection[] = [];
		if (filterBlock["OR"] || filterBlock["AND"]) {
			let collatedResultArray: ISection[][] = [];
			if (filterBlock["OR"]) {
				const orBlock = filterBlock["OR"];
				if (orBlock.length > 0) {
					for (let filter of orBlock) {
						let filteredSectionArray = this.mainWhereFilter(filter);
						collatedResultArray.push(filteredSectionArray);
					}
					finalResult = this.filterOr(collatedResultArray);
				} else {
					// Reject empty "OR" block array
					throw new InsightError("OR must be a non-empty array");
				}
			} else {
				const andBlock = filterBlock["AND"];
				if (andBlock.length > 0) {
					for (let filter of andBlock) {
						let filteredSectionArray = this.mainWhereFilter(filter);
						collatedResultArray.push(filteredSectionArray);
					}
					finalResult = this.filterAnd(collatedResultArray);
				} else {
					// Reject empty "AND" block array
					throw new InsightError("AND must be a non-empty array");
				}
			}
		} else if (filterBlock["LT"] || filterBlock["EQ"] || filterBlock["GT"]) {
			// M Comparison
			finalResult = this.mComparison(filterBlock);
		} else if (filterBlock["IS"]) {
			// S Comparison
			finalResult = this.sComparison(filterBlock);

		} else if (filterBlock["NOT"]) {
			// Negation
			const negBlock = filterBlock["NOT"];
			this.checkObjectLength(negBlock, "NOT");
			let toBeExcludedSectionArray: ISection[];
			toBeExcludedSectionArray = this.mainWhereFilter(negBlock);
			// Remove the originally filtered sections in NegBlock content (for negation):
			// https://stackoverflow.com/questions/19957348/remove-all-elements-contained-in-another-array
			finalResult = this.unchangedSections.filter((section) => {
				return !toBeExcludedSectionArray.includes(section);
			});
		} else {
			// Reject if invalid key
			throw new InsightError("Invalid key");
		}
		return finalResult;
	}

	public filterOr(collatedResultArray: ISection[][]): ISection[] {
		let finalArray: ISection[] = [];
		for(let currentArray of collatedResultArray){
			finalArray = finalArray.concat(currentArray);
		}
		for(let i = 0; i < finalArray.length; ++i) {
			for(let j = i + 1; j < finalArray.length; ++j) {
				if(finalArray[i] === finalArray[j]) {
					finalArray.splice(j--, 1);
				}
			}
		}
		return finalArray;
	}

	public filterAnd(collatedResultArray: ISection[][]): ISection[] {
		let finalArray = collatedResultArray[0];
		for(let i = 1; i < collatedResultArray.length; i++) {
			finalArray = finalArray.filter((section) => {
				return collatedResultArray[i].includes(section);
			});
		}
		return finalArray;
	}

	public sComparison(filterBlock: any): ISection[] {
		const sComBlock = filterBlock["IS"];
		this.checkObjectLength(sComBlock, "IS");
		// Getting individual values
		const filterKey = Object.keys(sComBlock);
		const filterKeyString = filterKey[0];
		const splitKey = filterKeyString.split("_");
		const specificFieldKey = splitKey[1]; // one out of nine field keys
		const filterValue = sComBlock[filterKeyString]; // field value
		this.setOriginalDatasetAndCheckDataset(filterKeyString);

		if(!(specificFieldKey === "dept" || specificFieldKey === "id" || specificFieldKey === "instructor" ||
			specificFieldKey === "title" || specificFieldKey === "uuid")) {
			// Reject if field is not a MField
			throw new InsightError(specificFieldKey + " is not a MField");
		}

		if (!(typeof filterValue === "string")) {
			// Reject if SComparison value is not a string
			throw new InsightError("SComparison Value is not a string");
		}

		if(filterValue.substring(1, filterValue.length - 1).includes("*")){
			throw new InsightError("Asterisks (*) can only be the first or last characters of input strings");
		}

		let resultArray = this.unchangedSections.filter((section: any) => {
			return this.sCompFilterValueMatching(filterValue, section, specificFieldKey);
		});

		return resultArray;
	}

	public sCompFilterValueMatching(filterValue: string, section: any, specificFieldKey: string) {
		if (filterValue.charAt(0) === "*") {
			return section[specificFieldKey].endsWith(filterValue.substring(1, filterValue.length));
		} else if (filterValue.charAt(filterValue.length - 1) === "*") {
			return section[specificFieldKey].startsWith(filterValue.substring(0, filterValue.length - 1));
		} else {
			return section[specificFieldKey] === filterValue;
		}
	}

	public mComparison(filterBlock: any): ISection[] {
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

		if (!(typeof filterValue === "number")) {
			// Reject if MComparison value is not a number
			throw new InsightError("MComparison Value is not a number");
		}
		let resultArray  = this.mComparisonFilter(filterBlock, specificFieldKey, filterValue);
		return resultArray ;
	}

	public mComparisonFilter(filterBlock: any, specificFieldKey: string, filterValue: any) {
		// New sectionArray
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

	public checkIfWhereBlockHasFiltered(filteredSections: ISection[], columnName: string): ISection[]{
		if(filteredSections.length !== 0){
			// WHERE block has filters and produced at least 1 results
			return filteredSections;
		}
		if(this.originalDataset !== ""){
			// WHERE block has filters and produced 0 results
			return filteredSections;
		} else {
			// WHERE block does not have filters and produced 0 results
			this.setOriginalDatasetAndCheckDataset(columnName);
			return this.unchangedSections;
		}
	}

	public checkIfKeyExistsInSection(specifiedField: string) {
		if(!(specifiedField === "avg" || specifiedField === "pass" || specifiedField === "fail" ||
			specifiedField === "audit" || specifiedField === "year" || specifiedField === "dept" ||
			specifiedField === "id" || specifiedField === "instructor" ||
			specifiedField === "title" || specifiedField === "uuid")) {
			// Reject if Key does not exist in Section
			throw new InsightError("Invalid key " + specifiedField + " in COLUMNS");
		}
	}

	public orderFunction(orderField: string, columnArray: any, results: InsightResult[]): InsightResult[] {
		// Sort by order
		let finalResults: InsightResult[] = results;
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
