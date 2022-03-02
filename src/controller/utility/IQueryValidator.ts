import {InsightDatasetKind, InsightError} from "../IInsightFacade";
import {
	checkDataset,
	checkDir,
	checkExists,
	checkField,
	checkKind,
	checkLength,
	checkNonEmptyArray,
	checkString,
	checkSubset,
	checkValidApplyRule,
	checkValidMCompArg,
	checkValidSCompArg,
	hasUnderscore,
	isCoursesField,
	isRoomsField,
	KeyType
} from "./IValidate";

// Class to validate query structure for InsightFacade
export class IQueryValidator {
	private datasetName: string = "";
	private datasetKind: string = "";
	public readonly validKeys: string[];
	public readonly columnsBlock: any;
	public readonly orderKeys: string[];
	private dir: string;

	// Constructs a performQuery object
	constructor(query: any) {
		this.checkWhereBlock(query["WHERE"]);

		const optionsBlock = query["OPTIONS"];
		checkExists(optionsBlock, "OPTIONS");

		// Check TRANSFORMATIONS block
		const transformBlock = query["TRANSFORMATIONS"];
		this.validKeys = [];
		if (transformBlock) {
			this.validKeys = this.extractValidKeys(transformBlock);
		}

		// Check COLUMNS, and check ORDER if it exists
		this.orderKeys = [];
		this.dir = "";
		this.columnsBlock = optionsBlock["COLUMNS"];
		this.checkColumnsBlock();
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
			checkLength(whereBlock, 0, "WHERE");
		} catch (error) {
			if (error instanceof InsightError) {
				// WHERE should only have 1 arg
				checkLength(whereBlock, 1, "WHERE");
				this.checkFilterBlock(whereBlock);
			} else {
				throw error;
			}
		}
	}

	private checkFilterBlock(block: any): void {
		if (block["OR"] || block["AND"]) {
			// Logic comparison
			checkLength(block, 1, "AND/OR");
			let filterKey = Object.keys(block)[0];
			let filters = block[filterKey];
			checkNonEmptyArray(filters, "AND/OR args");
			filters.forEach((filter: any) => {
				this.checkFilterBlock(filter); // Recurse on nested filters
			});
		} else if (block["LT"] || block["EQ"] || block["GT"]) {
			// M Comparison
			checkLength(block, 1, "LT/GT/EQ");
			let filterKey = Object.keys(block)[0];
			let mCompObj = block[filterKey];
			checkLength(mCompObj, 1, "MCOMP");
			let mKey = Object.keys(mCompObj)[0];
			this.checkValidKey(mKey, KeyType.M_KEY);
			let mCompArg = mCompObj[mKey];
			checkValidMCompArg(mCompArg);
		} else if (block["IS"]) {
			// S Comparison
			checkLength(block, 1, "IS");
			let sCompObj = block["IS"];
			checkLength(sCompObj, 1, "SCOMP");
			let sKey = Object.keys(sCompObj)[0];
			this.checkValidKey(sKey, KeyType.S_KEY);
			let sCompArg = sCompObj[sKey];
			checkValidSCompArg(sCompArg);
		} else if (block["NOT"]) {
			// Negation
			const negBlock = block["NOT"];
			checkLength(negBlock, 1, "NOT");
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
	private checkColumnsBlock(): void {
		checkExists(this.columnsBlock, "COLUMNS");
		checkNonEmptyArray(this.columnsBlock, "COLUMNS");
		if (this.validKeys.length > 0) {
			checkSubset(this.columnsBlock, this.validKeys, "COLUMNS", "GROUP/APPLY");
		} else {
			this.columnsBlock.forEach((columnKey: any) => {
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
			checkLength(orderBlock, 2, "ORDER");

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

	// Checks that an APPLY block is valid and returns the applyKey(s). If the APPLY block or any keys is invalid, throws an InsightError.
	private extractApplyKeys(applyBlock: any): string[] {
		checkExists(applyBlock, "APPLY in TRANSFORMATIONS");
		// Note: APPLY is allowed to be an empty array
		if (!Array.isArray(applyBlock)) {
			throw new InsightError("APPLY is not an array");
		}

		// Extract keys from block
		let extractedKeys: string[] = [];
		for (const item of applyBlock) {
			checkValidApplyRule(item, this);
			extractedKeys.push(Object.keys(item)[0]);
		}
		return extractedKeys;
	}

	// Checks that a TRANSFORMATIONS block is valid and returns key(s). If not, throws an InsightError.
	private extractValidKeys(transformBlock: any): string[] {
		checkLength(transformBlock, 2, "TRANSFORM");
		const groupBlock = transformBlock["GROUP"];
		this.checkGroupBlock(groupBlock);
		let groupAndApplyKeys: string[] = [];
		groupAndApplyKeys = groupAndApplyKeys.concat(groupBlock);
		groupAndApplyKeys = groupAndApplyKeys.concat(this.extractApplyKeys(transformBlock["APPLY"]));
		return groupAndApplyKeys;
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
		checkSubset(orderKeys, this.columnsBlock, "ORDER", "COLUMNS");
		return orderKeys;

	}

	// Checks if a key is valid, given a KeyType. If not, throws InsightError
	public checkValidKey(key: any, keyType: KeyType): void {
		checkString(key, "Key");
		if (keyType === KeyType.KEY || keyType === KeyType.M_KEY || keyType === KeyType.S_KEY) {
			const splitKey = key.split("_");
			checkLength(splitKey, 2, "Key");

			// Dataset check
			const specifiedDatasetName = splitKey[0];
			this.setDatasetName(specifiedDatasetName);
			checkDataset(specifiedDatasetName, this.datasetName);

			// Field check
			const specifiedField = splitKey[1];
			this.setDatasetKind(specifiedField);
			checkKind(specifiedField, this.datasetKind);
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

	// If datasetName is not set, sets it to specifiedDatasetName
	public setDatasetName(specifiedDatasetName: string) {
		if (this.datasetName === "") {
			this.datasetName = specifiedDatasetName;
		}
	}

	// If datasetKind is not set, sets it using the given field
	public setDatasetKind(field: any) {
		if (this.datasetKind === "") {
			if (isCoursesField(field)) {
				this.datasetKind = InsightDatasetKind.Courses;
			} else if (isRoomsField(field)) {
				this.datasetKind = InsightDatasetKind.Rooms;
			} else {
				throw new InsightError("Invalid field");
			}
		}
	}

	public getDatasetName(): string {
		return this.datasetName;
	}

	public getDatasetKind(): string {
		return this.datasetKind;
	}

	public getDir(): string {
		return this.dir;
	}
}
