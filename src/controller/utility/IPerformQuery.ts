import {InsightError, InsightResult} from "../IInsightFacade";
import {IKind} from "../interface/IKind";

export class IPerformQuery {
	protected unchangedKinds: IKind[];

	// Constructs a performQuery object
	constructor(kinds: IKind[]) {
		this.unchangedKinds = kinds;
	}

	public mainWhereFilter(filterBlock: any): IKind[] {
		let finalResult: IKind[] = [];
		if (filterBlock["OR"] || filterBlock["AND"]) {
			let collatedResultArray: IKind[][] = [];
			if (filterBlock["OR"]) {
				const orBlock = filterBlock["OR"];
				for (let filter of orBlock) {
					let filteredSectionArray = this.mainWhereFilter(filter);
					collatedResultArray.push(filteredSectionArray);
				}
				finalResult = this.filterOr(collatedResultArray);

			} else {
				const andBlock = filterBlock["AND"];
				for (let filter of andBlock) {
					let filteredSectionArray = this.mainWhereFilter(filter);
					collatedResultArray.push(filteredSectionArray);
				}
				finalResult = this.filterAnd(collatedResultArray);
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
			let toBeExcludedSectionArray: IKind[];
			toBeExcludedSectionArray = this.mainWhereFilter(negBlock);
			// Remove the originally filtered sections in NegBlock content (for negation):
			// https://stackoverflow.com/questions/19957348/remove-all-elements-contained-in-another-array
			finalResult = this.unchangedKinds.filter((section) => {
				return !toBeExcludedSectionArray.includes(section);
			});
		}
		return finalResult;
	}

	public filterOr(collatedResultArray: IKind[][]): IKind[] {
		let finalArray: IKind[] = [];
		for (let currentArray of collatedResultArray) {
			finalArray = finalArray.concat(currentArray);
		}
		for (let i = 0; i < finalArray.length; ++i) {
			for (let j = i + 1; j < finalArray.length; ++j) {
				if (finalArray[i] === finalArray[j]) {
					finalArray.splice(j--, 1);
				}
			}
		}
		return finalArray;
	}

	public filterAnd(collatedResultArray: IKind[][]): IKind[] {
		let finalArray = collatedResultArray[0];
		for (let i = 1; i < collatedResultArray.length; i++) {
			finalArray = finalArray.filter((section) => {
				return collatedResultArray[i].includes(section);
			});
		}
		return finalArray;
	}

	public sComparison(filterBlock: any): IKind[] {
		const sComBlock = filterBlock["IS"];
		// Getting individual values
		const filterKey = Object.keys(sComBlock);
		const filterKeyString = filterKey[0];
		const splitKey = filterKeyString.split("_");
		const specificFieldKey = splitKey[1]; // one out of nine field keys
		const filterValue = sComBlock[filterKeyString]; // field value
		return this.unchangedKinds.filter((section: any) => {
			return this.sCompFilterValueMatching(filterValue, section, specificFieldKey);
		});
	}

	public sCompFilterValueMatching(filterValue: string, section: any, specificFieldKey: string) {
		if (filterValue === "*") {
			return true;
		} else if (filterValue.startsWith("*") && filterValue.endsWith("*")) {
			return section[specificFieldKey].includes(filterValue.substring(1, filterValue.length - 1));
		} else if (filterValue.startsWith("*")) {
			return section[specificFieldKey].endsWith(filterValue.substring(1));
		} else if (filterValue.endsWith("*")) {
			return section[specificFieldKey].startsWith(filterValue.substring(0, filterValue.length - 1));
		} else {
			return section[specificFieldKey] === filterValue;
		}
	}

	public mComparison(filterBlock: any): IKind[] {
		let mComBlock: any;
		if (filterBlock["LT"]) {
			mComBlock = filterBlock["LT"];
		} else if (filterBlock["EQ"]) {
			mComBlock = filterBlock["EQ"];
		} else {
			mComBlock = filterBlock["GT"];
		}
		// Getting individual values
		const filterKey = Object.keys(mComBlock);
		const filterKeyString = filterKey[0];
		const splitKey = filterKeyString.split("_");
		const specificFieldKey = splitKey[1]; // one out of nine field keys
		const filterValue = mComBlock[filterKeyString]; // field value
		return this.mComparisonFilter(filterBlock, specificFieldKey, filterValue);
	}

	// TODO simplify?
	public mComparisonFilter(filterBlock: any, specificFieldKey: string, filterValue: any) {
		// New sectionArray
		return this.unchangedKinds.filter((section: any) => {
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

	// TODO check this works
	public checkIfWhereBlockHasFiltered(filteredSections: IKind[]): IKind[] {
		if (filteredSections.length !== 0) {
			// WHERE block has filters and produced at least 1 results
			return filteredSections;
		}
		return this.unchangedKinds;
	}

	// TODO use tuples to order
	// TODO refactor for orderBlock
	// TODO USE DIR
	public orderFunction(orderKeys: string[], columnArray: any, results: InsightResult[]): InsightResult[] {		// Sort by order
		let finalResults: InsightResult[] = results;
		if (orderKeys.length > 0) {
			// Sort
			finalResults = this.insertionSort(orderKeys, results);
		}
		return finalResults;
	}

	public insertionSort(orderArray: string[], results: InsightResult[]): InsightResult[] {
		let orderField = orderArray[0];
		for (let i = 1; i < results.length; i++) {
			let currentResultElement = results[i];
			let currentVariable = currentResultElement[orderField];
			let comparisonIndex = i - 1;
			while (comparisonIndex >= 0 && results[comparisonIndex][orderField] > currentVariable) {
				results[comparisonIndex + 1] = results[comparisonIndex];
				comparisonIndex = comparisonIndex - 1;
			}
			results[comparisonIndex + 1] = currentResultElement;
		}
		return results;
	}
}
