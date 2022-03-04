import {InsightError, InsightResult, ResultTooLargeError} from "../IInsightFacade";
import {IKind} from "../interface/IKind";
import {Direction} from "./IValidate";

// Class to extract InsightResults from a valid query
export class IPerformQuery {
	protected unchangedKinds: IKind[];
	protected insightResults: InsightResult[];

	constructor(kinds: IKind[], query: any, columnsArray: string[], orderKeys: string[], dir: string) {
		// Check if query is valid and initialize fields
		this.unchangedKinds = kinds;
		let filteredKinds: IKind[] = this.mainWhereFilter(query["WHERE"]);
		if (filteredKinds.length > 5000) {
			throw new ResultTooLargeError("The result is too big (>5000 results)");
		}
		let unorderedResults = this.createResultsWithSpecifiedFields(filteredKinds, columnsArray);
		this.insightResults = this.orderResults(unorderedResults, orderKeys, dir);

	}

	public getInsightResults(): InsightResult[] {
		return this.insightResults;
	}

	private mainWhereFilter(filterBlock: any): IKind[] {
		if (Object.keys(filterBlock).length === 0) {
			// Empty WHERE block
			return this.unchangedKinds;
		}
		let finalResult: IKind[] = [];
		if (filterBlock["OR"] || filterBlock["AND"]) {
			let collatedResultArray: IKind[][] = [];
			if (filterBlock["OR"]) {
				const orBlock = filterBlock["OR"];
				for (let filter of orBlock) {
					let filteredArray = this.mainWhereFilter(filter);
					collatedResultArray.push(filteredArray);
				}
				finalResult = this.filterOr(collatedResultArray);

			} else {
				const andBlock = filterBlock["AND"];
				for (let filter of andBlock) {
					let filteredArray = this.mainWhereFilter(filter);
					collatedResultArray.push(filteredArray);
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
			let toBeExcludedArray: IKind[];
			toBeExcludedArray = this.mainWhereFilter(negBlock);
			// Remove the originally filtered kinds in NegBlock content (for negation):
			// https://stackoverflow.com/questions/19957348/remove-all-elements-contained-in-another-array
			finalResult = this.unchangedKinds.filter((kind) => {
				return !toBeExcludedArray.includes(kind);
			});
		}
		return finalResult;
	}

	private filterOr(collatedResultArray: IKind[][]): IKind[] {
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

	private filterAnd(collatedResultArray: IKind[][]): IKind[] {
		let finalArray = collatedResultArray[0];
		for (let i = 1; i < collatedResultArray.length; i++) {
			finalArray = finalArray.filter((kind) => {
				return collatedResultArray[i].includes(kind);
			});
		}
		return finalArray;
	}

	private sComparison(filterBlock: any): IKind[] {
		const sComBlock = filterBlock["IS"];
		// Getting individual values
		const filterKey = Object.keys(sComBlock);
		const filterKeyString = filterKey[0];
		const splitKey = filterKeyString.split("_");
		const specificFieldKey = splitKey[1]; // one out of nine field keys
		const filterValue = sComBlock[filterKeyString]; // field value
		return this.unchangedKinds.filter((kind: any) => {
			return this.sCompFilterValueMatching(filterValue, kind, specificFieldKey);
		});
	}

	// Returns true if a kind's specified value matches a filter value
	private sCompFilterValueMatching(filterValue: string, kind: any, specificFieldKey: string): boolean {
		if (filterValue === "*") {
			return true;
		} else if (filterValue.startsWith("*") && filterValue.endsWith("*")) {
			return kind[specificFieldKey].includes(filterValue.substring(1, filterValue.length - 1));
		} else if (filterValue.startsWith("*")) {
			return kind[specificFieldKey].endsWith(filterValue.substring(1));
		} else if (filterValue.endsWith("*")) {
			return kind[specificFieldKey].startsWith(filterValue.substring(0, filterValue.length - 1));
		} else {
			return kind[specificFieldKey] === filterValue;
		}
	}

	private mComparison(filterBlock: any): IKind[] {
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

	private mComparisonFilter(filterBlock: any, specificFieldKey: string, filterValue: any) {
		// New array
		return this.unchangedKinds.filter((item: any) => {
			if (specificFieldKey in item) {
				if (filterBlock["LT"]) {
					return item[specificFieldKey] < filterValue;
				} else if (filterBlock["EQ"]) {
					return item[specificFieldKey] === filterValue;
				} else {
					return item[specificFieldKey] > filterValue;
				}
			} else {
				// Reject if key is invalid
				throw new InsightError("Invalid key " + specificFieldKey);
			}
		});
	}

	// Converts an IKind into an InsightResult with specified fields.
	private createResultWithSpecifiedFields(item: IKind, specifiedFields: string[]): InsightResult {
		let resultElement: InsightResult = {};
		for (const columnName of specifiedFields) {
			const splitKey = columnName.split("_");
			const specifiedField = splitKey[1];
			resultElement[columnName] = item[specifiedField as keyof IKind];
		}
		return resultElement;
	}

	// Converts a list of IKinds into InsightResults with specified fields.
	private createResultsWithSpecifiedFields(kinds: IKind[], specifiedFields: string[]): InsightResult[] {
		let results: InsightResult[] = [];
		for (const item of kinds) {
			const resultElement = this.createResultWithSpecifiedFields(item, specifiedFields);
			results.push(resultElement);
		}
		return results;
	}

	// Sort a list of InsightResults by a tuple (orderKeys) and direction using insertion sort
	private orderResults(results: InsightResult[], orderKeys: string[], dir: string): InsightResult[] {		// Sort by order
		for (let i = 1; i < results.length; i++) {
			let currentResultElement = results[i];
			let currentVariable = currentResultElement;
			let comparisonIndex = i - 1;
			while (comparisonIndex >= 0 &&
			this.compareResults(results[comparisonIndex], currentVariable, orderKeys, dir)) {
				results[comparisonIndex + 1] = results[comparisonIndex];
				comparisonIndex = comparisonIndex - 1;
			}
			results[comparisonIndex + 1] = currentResultElement;
		}
		return results;
	}

	// Given a direction and orderKeys, returns:
	// 	1	 if A comes before B
	// 	0	 if A is tied with B
	// -1	 if A comes after B
	private compareResults(resultA: InsightResult, resultB: InsightResult, orderKeys: string[], dir: string): number {
		if (orderKeys.length === 1) {
			let key = orderKeys[0];
			if (resultA[key] === resultB[key]) {
				return 0;
			}
			switch (dir) {
				case Direction.UP:
					// A before B iff A < B
					if (resultA[key] < resultB[key]) {
						return 1;
					} else {
						return -1;
					}
				case Direction.DOWN:
					// A before B iff A > B
					if (resultA[key] > resultB[key]) {
						return 1;
					} else {
						return -1;
					}
				default:
					throw new InsightError("Invalid DIRECTION");
			}
		} else {
			let firstKeyComparison = this.compareResults(resultA, resultB, [orderKeys[0]], dir);
			if (firstKeyComparison !== 0) {
				return this.compareResults(resultA, resultB, orderKeys.splice(1), dir);
			} else {
				return firstKeyComparison;
			}
		}

	}

}
