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
		} else if (filterBlock["LT"] || filterBlock["EQ"] || filterBlock["GT"] || filterBlock["IS"]) {
			finalResult = this.comparisonFilter(filterBlock, kinds);
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

	// Applies an sComp filter block to an array of kinds
	private comparisonFilter(filterBlock: any, kinds: IKind[]): IKind[] {
		// Getting individual values
		const filterName = Object.keys(filterBlock)[0];
		const comBlock = filterBlock[filterName];
		const filterKey = Object.keys(comBlock);
		const filterKeyString = filterKey[0];
		const splitKey = filterKeyString.split("_");
		const specificFieldKey = splitKey[1]; // one out of nine field keys
		const filterValue = comBlock[filterKeyString]; // field value
		if (filterName === "LT" || filterName === "EQ" || filterName === "GT") {
			return kinds.filter((kind: any) => {
				return IPerformQuery.mCompFilterValueMatching(filterName, specificFieldKey, filterValue, kind);
			});
		} else {
			return kinds.filter((kind: any) => {
				return IPerformQuery.sCompFilterValueMatching(filterValue, kind, specificFieldKey);
			});
		}
	}

	// Returns true if a kind's specified field matches a filter value
	private static sCompFilterValueMatching(filterValue: string, kind: any, specificFieldKey: string): boolean {
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

	// Returns true if a kind's specified field matches a filter value
	private static mCompFilterValueMatching(filterName: string, specificFieldKey: string, filterValue: any, kind: any) {
		if (filterName === "LT") {
			return kind[specificFieldKey] < filterValue;
		} else if (filterName === "EQ") {
			return kind[specificFieldKey] === filterValue;
		} else {
			return kind[specificFieldKey] > filterValue;
		}
	}
}
