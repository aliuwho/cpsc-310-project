import {InsightError} from "../IInsightFacade";

const sKeys = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname",
	"number", "name", "address", "type", "furniture", "href"];

// Returns true if a key is a valid mkey
function isValidSKey(key: string): boolean {
	return sKeys.includes(key);
}

// Returns true if field matches (\*)?[^\*]*(\*)?
// ie. asterisk is only at beginning or end, and in each location at most once
function isValidSField(field: string): boolean {
	if (field.startsWith("*")) {
		field = field.substring(1);
	}
	if (field.endsWith("*")) {
		field = field.substring(0, field.length - 1);
	}
	let temp = field.includes("*");
	return !temp;
}

// // Filters kinds array based on whether sKey matches filter with filterValue
// function sCompFilterValueMatching(filterValue: string, section: any, specificFieldKey: string): boolean {
// 	if (filterValue.startsWith("*") && filterValue.endsWith("*")) {
// 		return section[specificFieldKey].includes(filterValue.substring(1, filterValue.length - 1));
// 	} else if (filterValue.startsWith("*")) {
// 		return section[specificFieldKey].endsWith(filterValue.substring(1, filterValue.length));
// 	} else if (filterValue.endsWith("*")) {
// 		return section[specificFieldKey].startsWith(filterValue.substring(0, filterValue.length - 1));
// 	} else {
// 		return section[specificFieldKey] === filterValue;
// 	}
// }

export {isValidSKey, isValidSField};
