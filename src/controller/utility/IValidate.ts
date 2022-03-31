import {InsightDatasetKind, InsightError, InsightResult} from "../IInsightFacade";
import {IQueryValidator} from "./IQueryValidator";

// File to validate inputs for InsightFacade

const S_FIELDS = [
	"dept",
	"id",
	"instructor",
	"title",
	"uuid",
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"type",
	"furniture",
	"href",
];
const M_FIELDS = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
const COURSES_FIELDS = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
const ROOMS_FIELDS = [
	"lat",
	"lon",
	"seats",
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"type",
	"furniture",
	"href",
];

export enum KeyType {
	M_KEY = "M KEY",
	S_KEY = "S KEY",
	ANY_KEY = "ANY KEY",
	KEY = "KEY",
	APPLY_KEY = "APPLY KEY",
}

export enum Direction {
	UP = "UP", // Represents ascending order
	DOWN = "DOWN", // Represents descending order
}

export enum ApplyToken {
	COUNT = "COUNT",
	SUM = "SUM",
	MIN = "MIN",
	MAX = "MAX",
	AVG = "AVG",
}

// Throws InsightError if field is not a valid field for a keyType
export function checkField(field: string, keyType: KeyType): void {
	if (keyType === KeyType.M_KEY) {
		if (!isMField(field)) {
			throw new InsightError("Invalid MField: " + field);
		}
	} else if (keyType === KeyType.S_KEY) {
		if (!isSField(field)) {
			throw new InsightError("Invalid SField: " + field);
		}
	} else if (keyType === KeyType.KEY) {
		if (!isMField(field) && !isSField(field)) {
			throw new InsightError("Invalid key field: " + field);
		}
	} else {
		throw new Error("Invalid key type passed to checkField");
	}
}

// Returns true if a field is a courses field
export function isCoursesField(field: string): boolean {
	return COURSES_FIELDS.includes(field);
}

// Returns true if a field is a rooms field
export function isRoomsField(field: string): boolean {
	return ROOMS_FIELDS.includes(field);
}

// Returns true if a field is an SField (string field)
function isSField(field: string) {
	return S_FIELDS.includes(field);
}

// Returns true if a field is an MField (numeric field)
function isMField(field: string) {
	return M_FIELDS.includes(field);
}

// Checks that a string is a valid apply token
export function checkValidApplyToken(str: string) {
	if (!Object.keys(ApplyToken).includes(str)) {
		throw new InsightError("Invalid APPLY token");
	}
}

// Returns true if string has an underscore
export function hasUnderscore(str: string): boolean {
	return str.search("_+") > -1;
}

// Returns true if a string is not just whitespace characters
export function nonWhitespace(str: string): boolean {
	return str.search("[^\\t\\r\\n\\v\\f ]+") > -1;
}

// Check that an object has the correct length. Otherwise, throws InsightError with object's name
export function checkObjectLength(obj: any, len: number, name: string): void {
	const objectLength = Object.keys(obj).length;
	if (objectLength !== len) {
		throw new InsightError(name + " should only have " + len + " key(s), but has " + objectLength);
	}
}

// Check that an object is non-empty array.
// Otherwise, throws error with name
export function checkNonEmptyArray(obj: any, name: string): void {
	if (obj.length <= 0 || !Array.isArray(obj)) {
		// Reject if COLUMN array is empty
		throw new InsightError(name + " must be a non-empty array");
	}
}

// Check if all entries of subset appear in set. If not, throws InsightError.
export function checkSubset(subset: any[], set: any[], subsetName: string, setName: string): void {
	subset.forEach((item: any) => {
		checkString(item, subsetName);
		if (!set.includes(item)) {
			throw new InsightError(subsetName + " element must be in " + setName);
		}
	});
}

// Checks that a field is a string
export function checkString(field: any, errorLoc: string): void {
	if (typeof field !== "string") {
		throw new InsightError(errorLoc + " is not a string");
	}
}

// Returns true if field matches (\*)?[^\*]*(\*)? and field is a string
// ie. asterisk is only at beginning or end, and in each location at most once
export function checkValidSCompArg(field: any): void {
	// Type check
	checkString(field, "SComparison Value");

	// Semantics check
	if (field.startsWith("*")) {
		field = field.substring(1);
	}
	if (field.endsWith("*")) {
		field = field.substring(0, field.length - 1);
	}
	let invalid = field.includes("*");
	if (invalid) {
		throw new InsightError("Asterisks (*) can only appear as the first or last characters of input strings");
	}
}

// Checks that a mComp field is a number
export function checkValidMCompArg(field: any): void {
	if (typeof field !== "number") {
		// Reject if MComparison value is not a number
		throw new InsightError("MComparison Value is not a number");
	}
}

export function checkDir(dirBlock: any): void {
	checkExists(dirBlock, "dir in ORDER");
	checkString(dirBlock, "dir in ORDER");
	if (!Object.values(Direction).includes(dirBlock)) {
		throw new InsightError("ORDER dir is not a valid string (must be one of 'UP' or 'DOWN')");
	}
}

// Check that a field is consistent with an InsightDatasetKind. If not, throws InsightError
export function checkFieldMatchesKind(field: string, datasetKind: string) {
	if (datasetKind !== InsightDatasetKind.Rooms && datasetKind !== InsightDatasetKind.Courses) {
		throw new InsightError("Invalid dataset kind reference");
	}
	if (datasetKind === InsightDatasetKind.Courses && !isCoursesField(field)) {
		// Reject if different dataset types are being referenced
		throw new InsightError("Multiple dataset types cannot be referred");
	}
	if (datasetKind === InsightDatasetKind.Rooms && !isRoomsField(field)) {
		// Reject if different dataset types are being referenced
		throw new InsightError("Multiple dataset types cannot be referred");
	}
}

// Throws InsightError if different dataset names are referenced.
export function checkDataset(datasetA: string, datasetB: string) {
	if (datasetA !== datasetB) {
		throw new InsightError("Multiple datasets cannot be referred");
	}
}

// Check if an applyObject is a valid applyRule. Otherwise, throws InsightError.
export function checkValidApplyRule(applyObj: any, validator: IQueryValidator): void {
	checkObjectLength(applyObj, 1, "APPLY RULE");
	let applyKey = Object.keys(applyObj)[0];
	validator.checkValidKey(applyKey, KeyType.APPLY_KEY);
	let token = Object.keys(applyObj[applyKey])[0];
	checkValidApplyToken(token);
	let key = applyObj[applyKey][token];
	validator.checkValidKey(key, KeyType.KEY);
	let keyField = key.split("_")[1];
	checkField(keyField, KeyType.KEY);
	checkValidTokenField(keyField, token);
}

// Checks if a field is a valid field for an ApplyToken. If not, throws InsightError
function checkValidTokenField(field: string, token: string) {
	if (token !== ApplyToken.COUNT && isSField(field)) {
		throw new InsightError(token + " requires a numeric field");
	}
}

// Check if an object exists. If not, throw InsightError
export function checkExists(obj: any, name: string) {
	if (!obj) {
		throw new InsightError("Missing " + name);
	}
}

// Sort a list of InsightResults by a tuple (orderKeys) and direction using insertion sort
export function orderResults(results: InsightResult[], orderKeys: string[], dir: string): InsightResult[] {
	if (orderKeys.length === 0) {
		return results;
	}

	function compareResults(resultA: InsightResult, resultB: InsightResult): number {
		for (let key of orderKeys) {
			let comp = compareOnKey(resultA, resultB, key, dir);
			if (comp !== 0) {
				return comp;
			}
		}
		return 0;
	}

	results.sort(compareResults);
	return results;
}

// Given a direction and a key, returns:
// 	1	 if A comes after B
// 	0	 if A is tied with B
// -1	 if A comes before B
function compareOnKey(resultA: InsightResult, resultB: InsightResult, key: string, dir: string): number {
	if (resultA[key] === resultB[key]) {
		return 0;
	}
	switch (dir) {
		case Direction.UP:
			// A before B iff A < B
			if (resultA[key] < resultB[key]) {
				return -1;
			} else {
				return 1;
			}
		case Direction.DOWN:
			// A before B iff A > B
			if (resultA[key] > resultB[key]) {
				return -1;
			} else {
				return 1;
			}
		default:
			throw new InsightError("Invalid DIRECTION");
	}
}
