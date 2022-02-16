import {InsightDatasetKind} from "../../src/controller/IInsightFacade";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {existsSync, mkdirSync} from "fs";
import {expect} from "chai";
import {IElement} from "../../src/controller/interface/IElement";
import {ISection} from "../../src/controller/interface/ISection";
import * as fs from "fs-extra";
import {getKeys, writeCourseSections} from "../../src/controller/utility/IUtility";
import {parseFile, parseFileContent} from "../../src/controller/utility/IParse";
import JSZip from "jszip";

describe("IUtility", function () {

	describe("Utility Tests", function () {
		let testDatasets: Map<string, IElement>;
		const section1: ISection = {
			dept: "cpsc",
			id: "101",
			avg: 8.9,
			instructor: "mike gelbart",
			title: "intro to computer science",
			pass: 23,
			fail: 12,
			audit: 2,
			uuid: "1010",
			year: 2020,
		};
		const section2: ISection = {
			dept: "econ",
			id: "101",
			avg: 100,
			instructor: "mr. gateman",
			title: "economic systems",
			pass: 2,
			fail: 1,
			audit: 20,
			uuid: "110",
			year: 2022,
		};
		const section3: ISection = {
			dept: "stat",
			id: "421",
			avg: 69.2,
			instructor: "wolf skert",
			title: "statistics",
			pass: 7,
			fail: 8,
			audit: 6,
			uuid: "8023",
			year: 1973,
		};
		const courseSections: ISection[] = [section1, section2, section3];

		beforeEach(function () {
			testDatasets = new Map();
			clearDisk();
			try {
				mkdirSync("./data/test");
			} catch (error) {
				// do nothing if dir already exists
			}
		});

		describe("writeCourseSections tests", function () {
			it("should write valid course sections", function () {
				let path: string = "./data/test/writeValidSections.json";
				writeCourseSections(courseSections, path).then(() => {
					expect(existsSync(path)).to.equal(true);
				});
			});
		});

		describe("getKeys tests", function () {
			it("should return the keys for a dataset structure", function () {
				const elem1: IElement = {
					sections: courseSections,
					info: {id: "testElem", kind: InsightDatasetKind.Courses, numRows: 3},
				};
				testDatasets.set("testElem", elem1);
				let result = getKeys(testDatasets);
				expect(result).to.deep.equal(["testElem"]);
			});

			it("should return the keys for multiple dataset structures", function () {
				const elem1: IElement = {
					sections: courseSections,
					info: {id: "testElem", kind: InsightDatasetKind.Courses, numRows: 3},
				};
				testDatasets.set("testElem", elem1);
				const elem2: IElement = {
					sections: courseSections,
					info: {id: "testElem2", kind: InsightDatasetKind.Courses, numRows: 3},
				};
				testDatasets.set("testElem2", elem2);
				let result = getKeys(testDatasets);
				expect(result).to.deep.equal(["testElem", "testElem2"]);
			});
		});

		describe("parseFileContent tests", function () {
			it("should parse a valid JSON file with one course section", async function () {
				let data = fs.readFileSync("test/resources/json/utility/validJson.json").toString();
				let output = await parseFileContent(data);
				expect(output).to.have.length(1);
				expect(output).to.deep.equal([{
					dept: "aanb",
					id: "504",
					avg: 94.44,
					instructor: "",
					title: "rsrch methdlgy",
					pass: 9,
					fail: 0,
					audit: 9,
					uuid: "31379",
					year: 2015,
				}]);
			});

			it("should parse a valid JSON file for multiple course sections", async function () {
				let data = fs.readFileSync("test/resources/json/utility/validJsonThreeSections.json").toString();
				let output = await parseFileContent(data);
				expect(output).to.have.length(3);
				expect(output).to.have.deep.members(courseSections);
			});
		});

		describe("parseFile tests", function () {
			it("should parse a zip with 1 file containing only 1 valid section", function () {
				let zip = getContentFromArchives("validJson.zip");
				let jsZip = new JSZip();
				jsZip.loadAsync(zip).then((jsZip2) => {
					let obj = jsZip2.file("validJson.json");
					expect(obj).to.be.not.null;
					if (obj) {
						parseFile(obj, "./data/validJson/courses/aanb002.json").then((output) => {
							expect(output).to.have.length(1);
							expect(output).to.have.deep.members(courseSections);
						});
					}
				});
			});
		});

		it("should parse a zip with multiple valid sections", function () {
			let zip = getContentFromArchives("validJsonThreeSections.zip");
			let jsZip = new JSZip();
			jsZip.loadAsync(zip).then((jsZip2) => {
				let obj = jsZip2.file("validJson.json");
				expect(obj).to.be.not.null;
				if (obj) {
					parseFile(obj, "./data/validJson/courses/aanb002.json").then((output) => {
						expect(output).to.have.length(1);
						expect(output).to.have.deep.members(courseSections);
					});
				}
			});
		});

		it("should not parse from an invalid section in a zip", function () {
			let zip = getContentFromArchives("invalidJson.zip");
			let jsZip = new JSZip();
			jsZip.loadAsync(zip).then((jsZip2) => {
				let obj = jsZip2.file("invalidJson.json");
				expect(obj).to.be.not.null;
				if (obj) {
					parseFile(obj, "./data/validJson/courses/aanb002.json").then((output) => {
						expect(output).to.have.length(0);
					});
				}
			});
		});
	});
});
