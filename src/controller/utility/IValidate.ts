import {InsightDatasetKind, InsightError} from "../IInsightFacade";
import {IQueryValidator} from "./IQueryValidator";

// File to validate inputs for InsightFacade

const S_FIELDS = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname",
	"number", "name", "address", "type", "furniture", "href"];
const M_FIELDS = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
const COURSES_FIELDS = ["avg", "pass", "fail", "audit", "year", "dept",
	"id", "instructor", "title", "uuid"];
const ROOMS_FIELDS = ["lat", "lon", "seats", "fullname", "shortname",
	"number", "name", "address", "type", "furniture", "href"];
const APPLY_TOKENS = ["count", "sum", "min", "max", "avg"];

export enum KeyType {
	M_KEY = "M KEY",
	S_KEY = "S KEY",
	ANY_KEY = "ANY KEY",
	KEY = "KEY",
	APPLY_KEY = "APPLY KEY",
}

// Throws InsightError if field is not a valid field for a keyType
export function checkField(field: string, keyType: KeyType): void {
	if (keyType === KeyType.M_KEY) {
		if (!M_FIELDS.includes(field)) {
			throw new InsightError("Invalid MField: " + field);
		}
	} else if (keyType === KeyType.S_KEY) {
		if (!S_FIELDS.includes(field)) {
			throw new InsightError("Invalid SField: " + field);
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

// Checks that a string is a valid apply token
export function checkValidApplyToken(str: string) {
	return APPLY_TOKENS.includes(str);
}

// Returns true if string has an underscore
export function hasUnderscore(str: string): boolean {
	return str.search("_+") > -1;
}

// Returns true if a string is not just whitespace characters
export function nonWhitespace(str: string): boolean {
	return (str.search("[^\\t\\r\\n\\v\\f ]+") > -1);
}

// Check that an object has the correct length.
// Otherwise, throws InsightError using filterWord
export function checkLength(obj: any, numArgs: number, filterWord: string): void {
	const objectLength = Object.keys(obj).length;
	if (objectLength !== numArgs) {
		throw new InsightError(filterWord + " should only have " + numArgs + " key(s), but has " + objectLength);
	}
}

// Check that an object is non-empty array.
// Otherwise, throws error with name
export function checkNonEmptyArray(obj: any, name: string): void {
	if (obj.length <= 0 || !(Array.isArray(obj))) {
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
	if (dirBlock !== "UP" && dirBlock !== "DOWN") {
		throw new InsightError("ORDER dir is not a valid string (must be one of 'UP' or 'DOWN')");
	}
}

// Check that a field is consistent with an InsightDatasetKind. If not, throws InsightError
export function checkKind(field: string, datasetKind: string) {
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
	checkLength(applyObj, 1, "APPLY RULE");
	let applyKey = Object.keys(applyObj)[0];
	validator.checkValidKey(applyKey, KeyType.APPLY_KEY);
	let applyRuleValue = applyObj[applyKey];
	let applyToken = Object.keys(applyRuleValue)[0];
	checkValidApplyToken(applyToken);
	let applyTokenKey = applyRuleValue[applyToken];
	validator.checkValidKey(applyTokenKey, KeyType.KEY);
}

// Check if an object exists. If not, throw InsightError
export function checkExists(obj: any, name: string) {
	if (!obj) {
		throw new InsightError("Missing " + name);
	}
}
