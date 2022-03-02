import fs from "fs";
import {IElement} from "../interface/IElement";
import {InsightDataset} from "../IInsightFacade";
import {IKind} from "../interface/IKind";
import {IPerformQuery} from "./IPerformQuery";

// Writes course sections to a JSON file
export async function writeCourseSections(courseSections: IKind[], filePath: string): Promise<void> {
	await fs.writeFile(filePath, JSON.stringify(courseSections), () => 0);
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

// TODO check that this function hasn't been broken
export function createFieldInResultElementToBeAdded(columnName: any, performQueryTemp: IPerformQuery,
	resultElementToBeAdded: any, item: IKind): any {
	const splitKey = columnName.split("_");
	const specifiedField = splitKey[1];
	// Add field into resultElementToBeAdded object
	resultElementToBeAdded[columnName] = (item as IKind)[specifiedField as keyof IKind];
	return resultElementToBeAdded;
}
