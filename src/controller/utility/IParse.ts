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
		uuid: sectionObj.id,
		year: sectionObj.year,
	};
	return Promise.resolve(section);
}

// Helper function for parseFile
// Parses a JSON file containing course sections into an array of ISections
export async function parseFileContent(fileContent: string): Promise<ISection[]> {
	let object = JSON.parse(fileContent);
	object = object.result;
	// return if valid or not
	const promises: any[] = [];
	object.forEach((sectionObj: any) => {
		// add section to sections, if it is valid
		if (validSection(sectionObj)) {
			promises.push(parseSectionObj(sectionObj));
		}
	});
	return Promise.all(promises);
}

// Parses a JSZip object into course sections
export async function parseFile(file: JSZip.JSZipObject, filePath: string): Promise<ISection[]> {
	return file.async("string").then(async (fileContent) => {
		// parse file's contents
		// lowercase string for robust key handling
		let courseSections: ISection[] = [];
		return parseFileContent(fileContent.toLocaleLowerCase()).then((awaited) => {
			courseSections = courseSections.concat(awaited);
			if (awaited.length > 0) {
				writeCourseSections(courseSections, filePath);
			}
			return Promise.all<ISection[]>(courseSections);
		});
	});
}
