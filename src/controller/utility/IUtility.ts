import fs from "fs";
import {IElement} from "../interface/IElement";
import {InsightDataset, InsightError, InsightResult} from "../IInsightFacade";
import {IKind} from "../interface/IKind";
import {ApplyToken} from "./IValidate";
import Decimal from "decimal.js";

// Writes course sections to a JSON file
export async function writeSectionsAndRooms(kindInstance: IKind[], filePath: string): Promise<void> {
	await fs.writeFile(filePath, JSON.stringify(kindInstance), () => 0);
	return Promise.resolve();
}

// Get keys from a collection of datasets
export function getKeys(datasets: Map<string, IElement>) {
	const keys: string[] = [];
	datasets.forEach((value: IElement, key: string) => {
		keys.push(key);
	});
	return keys;
}

// Get InsightDatasets from a collection of datasets
export function getDatasets(datasets: Map<string, IElement>): InsightDataset[] {
	const ret: InsightDataset[] = [];
	for (const entry of datasets.entries()) {
		ret.push(entry[1].info);
	}
	return ret;
}

// Converts a list of IKinds into InsightResults with specified fields.
export function createResultsWithSpecifiedFields(kinds: IKind[], specifiedFields: string[]): InsightResult[] {
	let results: InsightResult[] = [];
	for (const item of kinds) {
		const resultElement = createResultWithSpecifiedFields(item, specifiedFields);
		results.push(resultElement);
	}
	return results;
}

// Converts an IKind into an InsightResult with specified fields.
function createResultWithSpecifiedFields(item: IKind, specifiedFields: string[]): InsightResult {
	let resultElement: InsightResult = {};
	for (const columnName of specifiedFields) {
		const splitKey = columnName.split("_");
		const specifiedField = splitKey[1];
		resultElement[columnName] = item[specifiedField as keyof IKind];
	}
	return resultElement;
}

// Returns a result with only the specified columns
export function selectFieldsFromResult(result: InsightResult, columnsArray: string[]): InsightResult {
	let newResult: InsightResult = {};
	for (const column of columnsArray) {
		newResult[column] = result[column];
	}
	return newResult;
}

// Returns kinds grouped by a groupKeys tuple
export function createGroupsFromKinds(kinds: IKind[], groupKeys: string[]): Map<string, IKind[]> {
	let groups = new Map<string, IKind[]>();
	for (const item of kinds) {
		let groupKey = getKindGroupValues(item, groupKeys);
		let group = groups.get(groupKey);
		if (group) {
			group.push(item);
			groups.set(groupKey, group);
		} else {
			groups.set(groupKey, [item]);
		}
	}
	return groups;
}

// Returns the id tuple for the group that a kind belongs to
function getKindGroupValues(kind: IKind, groupKeys: string[]): string {
	let groupValues: any[] = [];
	for (const groupKey of groupKeys) {
		let groupField = groupKey.split("_")[1];
		groupValues.push(kind[groupField as keyof IKind]);
	}
	return groupValues.toString();
}

// Applies applyRules to a group of IKinds and returns an InsightResult
export function applyRulesToGroup(group: IKind[], groupKeys: string[], applyRules: any[]): InsightResult {
	let result: InsightResult = {};
	let elem = group[0];

	// Add keys from groupKeys to result
	for (const groupKey of groupKeys) {
		let field = groupKey.split("_")[1];
		result[groupKey] = elem[field as keyof IKind];
	}

	// Add applyKeys and their values to result
	for (const applyRule of applyRules) {
		let applyKey = Object.keys(applyRule)[0];
		let applyToken = Object.keys(applyRule[applyKey])[0];
		let field = applyRule[applyKey][applyToken].split("_")[1]; // Key to apply rule on
		result[applyKey] = applyTokenToGroup(applyToken, field, group);
	}
	return result;
}

// Returns the value of an applyToken applied to a field for a group of kinds
function applyTokenToGroup(applyToken: string, field: string, kinds: IKind[]): any {
	if (applyToken === ApplyToken.AVG || applyToken === ApplyToken.SUM) {
		let sum = new Decimal(0);
		for (const item of kinds) {
			sum = sum.add(new Decimal(item[field as keyof IKind]));
		}
		if (applyToken === ApplyToken.AVG) {
			let avg = sum.toNumber() / kinds.length;
			return Number(avg.toFixed(2));
		}
		return Number(sum.toFixed(2));
	} else if (applyToken === ApplyToken.MAX) {
		let max = kinds[0][field as keyof IKind];
		for (let i = 1; i < kinds.length; i++) {
			let val = kinds[i][field as keyof IKind];
			if (val > max) {
				max = val;
			}
		}
		return max;
	} else if (applyToken === ApplyToken.MIN) {
		let min = kinds[0][field as keyof IKind];
		for (let i = 1; i < kinds.length; i++) {
			let val = kinds[i][field as keyof IKind];
			if (val < min) {
				min = val;
			}
		}
		return min;
	} else {
		// COUNT
		let uniqueValues = new Map<any, number>();
		for (const item of kinds) {
			let value = item[field as keyof IKind];
			let count = uniqueValues.get(value);
			if (count) {
				uniqueValues.set(value, count + 1);
			} else {
				uniqueValues.set(value, 1);
			}
		}
		return uniqueValues;
	}
}

// Throws err if it is not an InsightError
export function throwNonInsightError(err: unknown) {
	if (!(err instanceof InsightError)) {
		throw err;
	}
}
