import {InsightError} from "../IInsightFacade";
import {
	checkDataset,
	checkDir,
	checkExists,
	checkField,
	checkKind,
	checkNonEmptyArray,
	checkObjectLength,
	checkString,
	checkSubset,
	checkValidApplyRule,
	checkValidMCompArg,
	checkValidSCompArg,
	Direction,
	hasUnderscore,
	KeyType,
} from "./IValidate";
import {IElement} from "../interface/IElement";

// Class to validate query structure for InsightFacade
export class IQueryValidator {
	private datasetName: string = "";
	private groupKeys: string[];
	private applyBlock: any;
	private readonly columnsArray: any;
	private readonly orderKeys: string[];
	private dir: string = Direction.UP; // Default to ascending order
	public readonly hasTransform: boolean;
	private datasets: Map<string, IElement>;
	private dataset!: IElement;

	// Constructs a performQuery object
	constructor(query: any, datasets: Map<string, IElement>) {
		this.datasets = datasets;
		this.checkWhereBlock(query["WHERE"]);

		const optionsBlock = query["OPTIONS"];
		checkExists(optionsBlock, "OPTIONS");

		// Check TRANSFORMATIONS block
		const transformBlock = query["TRANSFORMATIONS"];
		this.hasTransform = false;
		this.groupKeys = [];
		if (transformBlock) {
			this.hasTransform = true;
			this.checkTransformBlock(transformBlock);
		}

		// Check COLUMNS, and check ORDER if it exists
		this.orderKeys = [];
		this.columnsArray = optionsBlock["COLUMNS"];
		this.checkColumnsArray();
		const orderBlock = optionsBlock["ORDER"];
		if (orderBlock) {
			this.orderKeys = this.extractOrderKeys(orderBlock);
		}
	}

	// Check that WHERE block is correctly formatted, including nested filters. Otherwise, throws an InsightError
	private checkWhereBlock(whereBlock: any) {
		checkExists(whereBlock, "WHERE");
		try {
			// Check if WHERE is empty
			checkObjectLength(whereBlock, 0, "WHERE");
		} catch (error) {
			if (error instanceof InsightError) {
				// WHERE should only have 1 arg
				checkObjectLength(whereBlock, 1, "WHERE");
				this.checkFilterBlock(whereBlock);
			} else {
				throw error;
			}
		}
	}

	private checkFilterBlock(block: any): void {
		if (block["OR"] || block["AND"]) {
			// Logic comparison
			checkObjectLength(block, 1, "AND/OR");
			let filterKey = Object.keys(block)[0];
			let filters = block[filterKey];
			checkNonEmptyArray(filters, "AND/OR args");
			filters.forEach((filter: any) => {
				this.checkFilterBlock(filter); // Recurse on nested filters
			});
		} else if (block["LT"] || block["EQ"] || block["GT"]) {
			// M Comparison
			checkObjectLength(block, 1, "LT/GT/EQ");
			let filterKey = Object.keys(block)[0];
			let mCompObj = block[filterKey];
			checkObjectLength(mCompObj, 1, "MCOMP");
			let mKey = Object.keys(mCompObj)[0];
			this.checkValidKey(mKey, KeyType.M_KEY);
			let mCompArg = mCompObj[mKey];
			checkValidMCompArg(mCompArg);
		} else if (block["IS"]) {
			// S Comparison
			checkObjectLength(block, 1, "IS");
			let sCompObj = block["IS"];
			checkObjectLength(sCompObj, 1, "SCOMP");
			let sKey = Object.keys(sCompObj)[0];
			this.checkValidKey(sKey, KeyType.S_KEY);
			let sCompArg = sCompObj[sKey];
			checkValidSCompArg(sCompArg);
		} else if (block["NOT"]) {
			// Negation
			const negBlock = block["NOT"];
			checkObjectLength(negBlock, 1, "NOT");
			this.checkFilterBlock(negBlock); // Recurse on nested filter
		} else {
			// Reject if invalid key
			throw new InsightError("Invalid filter");
		}
	}

	// Checks that a GROUP block is correctly formatted. Otherwise, throws InsightError
	private checkGroupBlock(groupBlock: any) {
		checkExists(groupBlock, "GROUP in TRANSFORMATIONS");
		checkNonEmptyArray(groupBlock, "GROUP");
		groupBlock.forEach((item: any) => {
			this.checkValidKey(item, KeyType.KEY);
		});
	}

	// Checks if COLUMNS block is correctly formatted and matches valid keys when valid keys is non-empty.
	// If not, throws InsightError.
	private checkColumnsArray(): void {
		checkExists(this.columnsArray, "COLUMNS");
		checkNonEmptyArray(this.columnsArray, "COLUMNS");
		let validKeys = this.groupKeys.concat(this.extractApplyKeys());
		if (validKeys.length > 0) {
			checkSubset(this.columnsArray, validKeys, "COLUMNS", "GROUP/APPLY");
		} else {
			this.columnsArray.forEach((columnKey: any) => {
				this.checkValidKey(columnKey, KeyType.KEY);
			});
		}
	}

	// Checks that an ORDER block is correctly formatted. If not, throws an InsightError
	private checkOrderBlock(orderBlock: any): void {
		if (typeof orderBlock === "string") {
			this.checkValidKey(orderBlock, KeyType.ANY_KEY);
		} else {
			// Case where order has 2 args
			checkObjectLength(orderBlock, 2, "ORDER");

			// Check that dir block is correct
			checkDir(orderBlock["dir"]);
			this.dir = orderBlock["dir"];

			// Check keys
			let keyArray = orderBlock["keys"];
			if (keyArray) {
				checkNonEmptyArray(keyArray, "ORDER keys");
				keyArray.forEach((key: any) => {
					this.checkValidKey(key, KeyType.ANY_KEY);
				});
			} else {
				throw new InsightError("ORDER block is missing keys");
			}
		}
	}

	// Returns the applyKey(s) of the applyBlock (if it exists). If any of the keys is invalid, throws an InsightError.
	private extractApplyKeys(): string[] {
		if (!this.applyBlock) {
			return [];
		}
		let extractedKeys: string[] = [];
		for (const item of this.applyBlock) {
			checkValidApplyRule(item, this);
			extractedKeys.push(Object.keys(item)[0]);
		}
		return extractedKeys;
	}

	// Checks that a TRANSFORMATIONS block is valid and extracts key(s). If not, throws an InsightError.
	private checkTransformBlock(transformBlock: any) {
		checkObjectLength(transformBlock, 2, "TRANSFORM");
		const groupBlock = transformBlock["GROUP"];
		this.checkGroupBlock(groupBlock);
		this.groupKeys = groupBlock;

		this.applyBlock = transformBlock["APPLY"];
		checkExists(this.applyBlock, "APPLY in TRANSFORMATIONS");
		// Note: APPLY is allowed to be an empty array
		if (!Array.isArray(this.applyBlock)) {
			throw new InsightError("APPLY is not an array");
		}
	}

	// Checks that an ORDER block is valid and returns the key(s). If the ORDER block or any keys is invalid, throws an InsightError.
	private extractOrderKeys(orderBlock: any): string[] {
		this.checkOrderBlock(orderBlock);
		let orderKeys;
		if (typeof orderBlock === "string") {
			orderKeys = [orderBlock];
		} else {
			orderKeys = orderBlock["keys"];
		}
		checkSubset(orderKeys, this.columnsArray, "ORDER", "COLUMNS");
		return orderKeys;
	}

	// Checks if a key is valid, given a KeyType. If not, throws InsightError
	public checkValidKey(key: any, keyType: KeyType): void {
		checkString(key, "Key");
		if (keyType === KeyType.KEY || keyType === KeyType.M_KEY || keyType === KeyType.S_KEY) {
			const splitKey = key.split("_");
			checkObjectLength(splitKey, 2, "Key");

			// Dataset check
			const specifiedDatasetName = splitKey[0];
			this.setDataset(specifiedDatasetName);
			checkDataset(specifiedDatasetName, this.datasetName);

			// Field check
			const specifiedField = splitKey[1];
			checkKind(specifiedField, this.dataset.info.kind);
			if (keyType === KeyType.KEY) {
				// A valid key is a valid mkey or skey; check both
				try {
					checkField(specifiedField, KeyType.M_KEY);
				} catch (error) {
					if (error instanceof InsightError) {
						checkField(specifiedField, KeyType.S_KEY);
					} else {
						throw error;
					}
				}
			} else {
				checkField(specifiedField, keyType);
			}
		} else if (keyType === KeyType.ANY_KEY) {
			// Checks if a key is a valid anykey (key | applykey)
			try {
				this.checkValidKey(key, KeyType.KEY);
			} catch (error) {
				if (error instanceof InsightError) {
					this.checkValidKey(key, KeyType.APPLY_KEY);
				} else {
					throw error;
				}
			}
		} else if (keyType === KeyType.APPLY_KEY) {
			if (hasUnderscore(key)) {
				throw new InsightError("Apply key cannot contain underscores");
			}
		} else {
			throw new InsightError("Invalid KeyType");
		}
	}

	// If the dataset is not set, checks that the specified dataset is valid and sets the dataset.
	private setDataset(specifiedDatasetName: string) {
		if (this.datasetName === "") {
			this.datasetName = specifiedDatasetName;
			let dataset = this.datasets.get(specifiedDatasetName);
			if (!dataset) {
				throw new InsightError("Referenced dataset " + this.datasetName + " not added yet ");
			}
			this.dataset = dataset;
		}
	}

	public getDataset(): IElement {
		return this.dataset;
	}

	public getDir(): string {
		return this.dir;
	}

	public getOrderKeys(): string[] {
		return this.orderKeys;
	}

	public getColumnsArray(): string[] {
		return this.columnsArray;
	}

	public getGroupKeys(): string[] {
		return this.groupKeys;
	}

	public getApplyRules(): string[] {
		return this.applyBlock;
	}
}
