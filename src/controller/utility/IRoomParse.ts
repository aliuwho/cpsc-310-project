import {ChildNode, Element, ParentNode, parse} from "parse5";
import http from "http";
import JSZip from "jszip";
import {InsightError} from "../IInsightFacade";
import {IRoom} from "../interface/IKind";
import {writeSectionsAndRooms} from "./IUtility";

// Parses a JSZip object representing a file into rooms in buildings and writes rooms to filePath in JSON format
export async function parseAndWriteHtmlFile(
	indexHtm: any,
	folderZip: JSZip | null,
	filePath: string
): Promise<IRoom[]> {
	return indexHtm?.async("string").then(async (fileContent: string) => {
		let indexDocument = parse(fileContent);
		// DFS for table objects
		const allPromisedRooms = parseRoomsFromIndex(indexDocument.childNodes, folderZip as JSZip);
		return Promise.all(allPromisedRooms).then((awaitedRoomArrays) => {
			const allActualRooms = awaitedRoomArrays.flat(1);
			writeSectionsAndRooms(allActualRooms, filePath);
			return Promise.resolve(allActualRooms);
		});
	});
}

// Main DFS to produce an array of Promise<IRoom[]> for multiple rooms in multiple buildings from the index.htm file
export function parseRoomsFromIndex(nodeArray: ChildNode[], folderZip: JSZip): any[] {
	let allPromises: any[] = [];
	for (const childNode of nodeArray) {
		if (
			childNode.nodeName === "td" &&
			"attrs" in childNode &&
			childNode.attrs[0].value === "views-field views-field-nothing"
		) {
			allPromises.push(searchForRoomsinBuilding(childNode, folderZip));
		} else if ("childNodes" in childNode) {
			allPromises = allPromises.concat(parseRoomsFromIndex(childNode.childNodes, folderZip));
		}
	}
	return allPromises; // [Promise<IRoom[]>, Promise<IRoom[]>, ...]
}

// Parses a Promise<IRoom[]> for multiple rooms in 1 building from the index.htm file and building.htm file
async function searchForRoomsinBuilding(childNode: Element, folderZip: JSZip): Promise<IRoom[]> {
	let promisedRoomArrayForOneBuilding: IRoom[] = [];
	// Get directory
	let tempDirectory = "";
	if ("attrs" in childNode.childNodes[1]) {
		tempDirectory = childNode.childNodes[1].attrs[0].value;
	}
	// Get parent node to get other information for 1 building
	const trNode = childNode.parentNode;
	const extractedBuildingInfo = extractBuildingInfo(trNode as Element);
	const tempShortName = extractedBuildingInfo.tempShortName;
	const tempFullName = extractedBuildingInfo.tempFullName;
	const tempAddress = extractedBuildingInfo.tempAddress;
	let geoLocationObject: any = {};
	try {
		geoLocationObject = await findGeolocation(tempAddress);
	} catch (error) {
		return Promise.resolve([]);
	}

	if ("error" in geoLocationObject) {
		return Promise.resolve([]);
	}

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
				number: roomInfo["tempRoomNumber"],
				name: tempShortName + "_" + roomInfo["tempRoomNumber"],
				address: tempAddress,
				lat: geoLocationObject["lat"],
				lon: geoLocationObject["lon"],
				seats: parseInt(roomInfo["tempCapacity"], 10),
				type: roomInfo["tempRoomType"],
				furniture: roomInfo["tempFurnitureType"],
				href: roomInfo["tempHref"],
			};
			promisedRoomArrayForOneBuilding.push(room);
		});
	}
	return Promise.resolve(promisedRoomArrayForOneBuilding);
}

// Helper function: extract tempShortName, tempFullName, tempAddress from index.htm file
function extractBuildingInfo(trNode: Element): any {
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
		} else if ("attrs" in trChild && trChild.attrs[0].value === "views-field views-field-field-building-address") {
			tempAddress = extractValue(trChild, tempShortName);
		}
	});
	return {tempShortName, tempFullName, tempAddress};
}

// Helper function: extract the specific td value from index.htm file
function extractValue(trChild: Element, tempShortName: string) {
	if ("value" in trChild.childNodes[0]) {
		tempShortName = trChild.childNodes[0].value.trim();
	}
	return tempShortName;
}

// Helper function: returns promise of the geolocation GET request response
function findGeolocation(tempAddress: string): Promise<any> {
	return new Promise(function (resolve, reject) {
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
		}).on("error", () => {
			console.error("Got error: ${e.message}");
			return reject("dummy");
		});
	});
}

// Get other information for 1 building from a ParentNode
function extractBuildingInfoFromParent(trNode: ParentNode, tempHref: string) {
	let tempRoomNumber = "";
	let tempCapacity = "";
	let tempFurnitureType = "";
	let tempRoomType = "";
	trNode.childNodes.forEach((trChild) => {
		if ("attrs" in trChild && trChild.attrs[0].value === "views-field views-field-field-room-number") {
			if ("childNodes" in trChild.childNodes[1] && "value" in trChild.childNodes[1].childNodes[0]) {
				tempRoomNumber = trChild.childNodes[1].childNodes[0].value;
			}
		} else if ("attrs" in trChild && trChild.attrs[0].value === "views-field views-field-field-room-capacity") {
			tempCapacity = extractValue(trChild, tempCapacity);
			if (!tempCapacity) {
				tempCapacity = "0";
			}
		} else if ("attrs" in trChild && trChild.attrs[0].value === "views-field views-field-field-room-furniture") {
			tempFurnitureType = extractValue(trChild, tempFurnitureType);
		} else if ("attrs" in trChild && trChild.attrs[0].value === "views-field views-field-field-room-type") {
			tempRoomType = extractValue(trChild, tempRoomType);
		}
	});
	return {
		tempRoomNumber,
		tempCapacity,
		tempFurnitureType,
		tempRoomType,
		tempHref,
	};
}

// Parses an array of buildingInfo objects for multiple rooms in 1 building from the building.htm file
function searchForBuildingInformation(nodeArray: ChildNode[], resultArray: any[]): any[] {
	nodeArray.forEach((childNode) => {
		if (
			childNode.nodeName === "td" &&
			"attrs" in childNode &&
			childNode.attrs[0].value === "views-field views-field-nothing"
		) {
			// Get directory
			let tempHref = "";
			if ("attrs" in childNode.childNodes[1]) {
				tempHref = childNode.childNodes[1].attrs[0].value;
			}
			let buildingInfo = extractBuildingInfoFromParent(childNode.parentNode, tempHref);
			resultArray.push(buildingInfo);
		} else if ("childNodes" in childNode) {
			searchForBuildingInformation(childNode.childNodes, resultArray);
		}
	});
	return resultArray;
}
