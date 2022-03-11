import {InsightError} from "../IInsightFacade";
import {IKind} from "../interface/IKind";

// Class to extract filtered IKinds for a valid query
export class IPerformQuery {
	protected unchangedKinds: IKind[];
	protected filteredKinds: IKind[];

	constructor(kinds: IKind[], query: any) {
		this.unchangedKinds = kinds;
		this.filteredKinds = this.mainWhereFilter(query["WHERE"], this.unchangedKinds.slice());
	}

	public getFilteredKinds(): IKind[] {
		return this.filteredKinds;
	}

	private mainWhereFilter(filterBlock: any, kinds: IKind[]): IKind[] {
		if (Object.keys(filterBlock).length === 0) {
			// Empty WHERE block
			return kinds;
		}
		let finalResult: IKind[] = [];
		if (filterBlock["OR"] || filterBlock["AND"]) {
			if (filterBlock["OR"]) {
				const orBlock = filterBlock["OR"];
				for (let filter of orBlock) {
					let filteredArray = this.mainWhereFilter(filter, this.unchangedKinds.slice());
					filteredArray = filteredArray.filter((kind) => {
						return !finalResult.includes(kind);
					});
					finalResult = finalResult.concat(filteredArray);
				}
			} else {
				finalResult = kinds.slice();
				const andBlock = filterBlock["AND"];
				for (let filter of andBlock) {
					let filteredArray = this.mainWhereFilter(filter, finalResult);
					finalResult = finalResult.filter((kind) => {
						return filteredArray.includes(kind);
					});
				}
			}
		} else if (filterBlock["LT"] || filterBlock["EQ"] || filterBlock["GT"]) {
			// M Comparison
			finalResult = this.mComparison(filterBlock, kinds);
		} else if (filterBlock["IS"]) {
			// S Comparison
			finalResult = this.sComparison(filterBlock, kinds);
		} else if (filterBlock["NOT"]) {
			// Negation
			const negBlock = filterBlock["NOT"];
			let toBeExcludedArray: IKind[];
			toBeExcludedArray = this.mainWhereFilter(negBlock, kinds.slice());
			// Remove the originally filtered kinds in NegBlock content (for negation):
			// https://stackoverflow.com/questions/19957348/remove-all-elements-contained-in-another-array
			finalResult = kinds.filter((kind) => {
				return !toBeExcludedArray.includes(kind);
			});
		}
		return finalResult;
	}

	private sComparison(filterBlock: any, kinds: IKind[]): IKind[] {
		const sComBlock = filterBlock["IS"];
		// Getting individual values
		const filterKey = Object.keys(sComBlock);
		const filterKeyString = filterKey[0];
		const splitKey = filterKeyString.split("_");
		const specificFieldKey = splitKey[1]; // one out of nine field keys
		const filterValue = sComBlock[filterKeyString]; // field value
		return kinds.filter((kind: any) => {
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

	private mComparison(filterBlock: any, kinds: IKind[]): IKind[] {
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
		return this.mComparisonFilter(filterBlock, specificFieldKey, filterValue, kinds);
	}

	private mComparisonFilter(filterBlock: any, specificFieldKey: string, filterValue: any, kinds: IKind[]) {
		// New array
		return kinds.filter((item: any) => {
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
}
