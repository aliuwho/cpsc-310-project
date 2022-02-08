import {ISection} from "../interface/ISection";
import {writeCourseSections} from "./IUtility";
import JSZip from "jszip";

// Helper function for parseFileContent
// Returns true if a section object is valid and can be parsed into a section
export function validSection(sectionObj: any): boolean {
	return (
		sectionObj.subject != null &&
		sectionObj.course != null &&
		sectionObj.avg != null &&
		sectionObj.professor != null &&
		sectionObj.title != null &&
		sectionObj.pass != null &&
		sectionObj.fail != null &&
		sectionObj.audit != null &&
		sectionObj.id != null &&
		sectionObj.year != null
	);
}

// Parses a section object into a section
async function parseSectionObj(sectionObj: any): Promise<ISection> {
	// create ISection from fileContent
	const section: ISection = {
		dept: sectionObj.subject,
		id: sectionObj.course,
		avg: sectionObj.avg,
		instructor: sectionObj.professor,
		title: sectionObj.title,
		pass: sectionObj.pass,
		fail: sectionObj.fail,
		audit: sectionObj.audit,
		uuid: sectionObj.id.toString(),
		year: parseInt(sectionObj.year, 10),
	};
	return Promise.resolve(section);
}

// Helper function for parseFile
// Parses a JSON file containing course sections into an array of ISections
export async function parseFileContent(fileContent: string): Promise<ISection[]> {
	const promises: any[] = [];
	try {
		// lowercase for more robust key handling
		let object = JSON.parse(fileContent.toLocaleLowerCase());
		object = object.result;
		// return if valid or not
		object.forEach((sectionObj: any) => {
			// add section to sections, if it is valid
			if (validSection(sectionObj)) {
				promises.push(parseSectionObj(sectionObj));
			}
		});
	} catch (error) {
		// ignore invalid JSONs
	}
	return Promise.all(promises);
}

// Parses a JSZip object representing a file into course sections and writes sections to filePath in JSON format
export async function parseFile(file: JSZip.JSZipObject, filePath: string): Promise<ISection[]> {
	return file.async("string").then(async (fileContent) => {
		// parse file's contents
		// lowercase string for robust key handling
		let courseSections: ISection[] = [];
		return parseFileContent(fileContent).then((awaited) => {
			if (awaited.length > 0) {
				courseSections = courseSections.concat(awaited);
				writeCourseSections(courseSections, filePath);
			}
			return Promise.all<ISection[]>(courseSections);
		});
	});
}
