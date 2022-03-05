import {ChildNode, Element, parse} from "parse5";
import http from "http";
import JSZip from "jszip";
import {InsightError} from "../IInsightFacade";
import {IRoom, ISection} from "../interface/IKind";
import {writeSectionsAndRooms} from "./IUtility";
import {parseJsonToCourseSections} from "./IParse";

export async function parseAndWriteHtmlFile(indexHtm: any, folderZip: JSZip | null, filePath: string):
	Promise<IRoom[]> {
	return indexHtm?.async("string").then(async (fileContent: string) => {
		let indexDocument = parse(fileContent);

		// DFS for table objects
		const awaitedRooms = await searchIndex(indexDocument.childNodes, folderZip as JSZip, []);
		writeSectionsAndRooms(awaitedRooms, filePath);
		return Promise.all<IRoom[]>(awaitedRooms);
	});
}

export function searchIndex(nodeArray: ChildNode[], folderZip: JSZip, allPromises: any[]): Promise<IRoom[]> {
	nodeArray.forEach((childNode) => {
		if (childNode.nodeName === "td" && "attrs" in childNode &&
			childNode.attrs[0].value === "views-field views-field-field-building-image") {
			allPromises = allPromises.concat(searchForRoomsinBuilding(childNode, folderZip));
		} else if ("childNodes" in childNode) {
			searchIndex(childNode.childNodes, folderZip, allPromises);
		}
	});
	return Promise.all(allPromises);
}

async function searchForRoomsinBuilding(childNode: Element, folderZip: JSZip): Promise<IRoom[]> {
	let promisedRoomArrayForOneBuilding: IRoom[] = [];
	// Get directory
	let tempDirectory = "";
	if("attrs" in childNode.childNodes[1]) {
		tempDirectory = childNode.childNodes[1].attrs[0].value;
	}
	// Get parent node to get other information for 1 building
	const trNode = childNode.parentNode;
	const extractedBuildingInfo = extractBuildingInfo(trNode as Element);
	const tempShortName = extractedBuildingInfo.tempShortName;
	const tempFullName = extractedBuildingInfo.tempFullName;
	const tempAddress = extractedBuildingInfo.tempAddress;
	const geoLocationObject = await findGeolocation(tempAddress);

	// Using JSZip to access files for additional information
	// Access the files
	let buildingHtm = folderZip.file(tempDirectory.substring(2));
	// Rejects if index.htm does not exist
	if (buildingHtm === null) {
		throw new InsightError("building file does not exist");
	}

	// Convert building.htm to string and retrieve information
	const buildingFileContent = await buildingHtm.async("string");
	const buildingDocument = parse(buildingFileContent);
	// DFS for table objects
	let buildingInfo = searchForBuildingInformation(buildingDocument.childNodes, []);
	// Proceed only if building has rooms
	if (buildingInfo.length !== 0) {
		buildingInfo.forEach((roomInfo) => {
			let room: IRoom = {
				fullname: tempFullName,
				shortname: tempShortName,
				number: roomInfo["tempRoom"],
				name: tempShortName + roomInfo["tempRoom"],
				address: tempAddress,
				lat: geoLocationObject["lat"],
				lon: geoLocationObject["lon"],
				seats: parseInt(roomInfo["tempCapacity"], 10),
				type: roomInfo["tempRoomType"],
				furniture: roomInfo["tempFurnitureType"],
				href: roomInfo["tempHref"]
			};
			promisedRoomArrayForOneBuilding.push(room);
		});
	}
	return Promise.resolve(promisedRoomArrayForOneBuilding);
}


function extractBuildingInfo(trNode: Element) {
	let tempShortName = "";
	let tempFullName = "";
	let tempAddress = "";
	trNode.childNodes.forEach((trChild) => {
		if ("attrs" in trChild && trChild.attrs[0].value === "views-field views-field-field-building-code") {
			tempShortName = extractValue(trChild, tempShortName);
		} else if ("attrs" in trChild && trChild.attrs[0].value === "views-field views-field-title") {
			if ("childNodes" in trChild.childNodes[1] && "value" in trChild.childNodes[1].childNodes[0]) {
				tempFullName = trChild.childNodes[1].childNodes[0].value;
			}
		} else if ("attrs" in trChild &&
			trChild.attrs[0].value === "views-field views-field-field-building-address") {
			tempAddress = extractValue(trChild, tempShortName);
		}
	});
	return {tempShortName, tempFullName, tempAddress};
}

function extractValue(trChild: Element, tempShortName: string) {
	if ("value" in trChild.childNodes[0]) {
		tempShortName = trChild.childNodes[0].value.trim();
	}
	return tempShortName;
}

function findGeolocation(tempAddress: string): Promise<any>{
	return new Promise(function(resolve, reject) {
		http.get(encodeURI("http://cs310.students.cs.ubc.ca:11316/api/v1/project_team573/" + tempAddress), (res) => {
			let rawData = "";
			res.on("data", (chunk) => {
				rawData += chunk;
			});
			res.on("end", () => {
				let parsedData;
				try {
					parsedData = JSON.parse(rawData);
				} catch (error) {
					return reject(error);
				}
				return resolve(parsedData);
			});
		}).on("error", (e) => {
			console.error("Got error: ${e.message}");
		});
	});
}

function searchForBuildingInformation(nodeArray: ChildNode[], resultArray: any[]): any[] {
	nodeArray.forEach((childNode) => {
		if (childNode.nodeName === "td" && "attrs" in childNode &&
			childNode.attrs[0].value === "views-field views-field-nothing") {
			// Get directory
			let tempHref = "";
			if("attrs" in childNode.childNodes[1]) {
				tempHref = childNode.childNodes[1].attrs[0].value;
			}
			// Get parent node to get other information for 1 building
			const trNode = childNode.parentNode;
			let tempRoomNumber = "";
			let tempCapacity = "";
			let tempFurnitureType = "";
			let tempRoomType = "";
			trNode.childNodes.forEach((trChild) => {
				if ("attrs" in trChild && trChild.attrs[0].value === "views-field views-field-field-room-number"){
					if ("childNodes" in trChild.childNodes[1] && "value" in trChild.childNodes[1].childNodes[0]) {
						tempRoomNumber = trChild.childNodes[1].childNodes[0].value;
					}
				} else if ("attrs" in trChild &&
					trChild.attrs[0].value === "views-field views-field-field-room-capacity"){
					tempCapacity = extractValue(trChild, tempCapacity);
				} else if ("attrs" in trChild &&
					trChild.attrs[0].value === "views-field views-field-field-room-furniture"){
					tempFurnitureType = extractValue(trChild, tempFurnitureType);
				} else if ("attrs" in trChild && trChild.attrs[0].value === "views-field views-field-field-room-type"){
					tempRoomType = extractValue(trChild, tempRoomType);
				}
			});
			let buildingInfo = {
				tempRoomNumber,
				tempCapacity,
				tempFurnitureType,
				tempRoomType,
				tempHref
			};
			resultArray.push(buildingInfo);
		} else if ("childNodes" in childNode) {
			searchForBuildingInformation(childNode.childNodes, resultArray);
		}
	});
	// Base Case
	return resultArray;
}


