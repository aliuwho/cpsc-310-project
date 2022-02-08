import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use} from "chai";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {folderTest} from "@ubccpsc310/folder-test";
import {ISection} from "../../src/controller/interface/ISection";
import {existsSync, mkdirSync} from "fs";
import {IElement} from "../../src/controller/interface/IElement";
import * as fs from "fs-extra";
import {getKeys, writeCourseSections} from "../../src/controller/utility/IUtility";
import {parseFile, parseFileContent} from "../../src/controller/utility/IParse";
import JSZip from "jszip";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

// For folderTest
type Input = unknown;
type Output = Promise<InsightResult[]>;
type Error = "InsightError" | "ResultTooLargeError";

describe("InsightFacade", function () {
	let courses: string;
	let courses2: string;

	before(function () {
		courses = getContentFromArchives("courses.zip");
	});

	describe("Utility Tests", function () {
		let testDatasets: Map<string, IElement>;
		let section1: ISection;
		let section2: ISection;
		let section3: ISection;
		let courseSections: ISection[];

		beforeEach(function () {
			clearDisk();
			try {
				mkdirSync("./data/test", {recursive: true});
			} catch (error) {
				// do nothing if dir already exists
			}

			testDatasets = new Map();
			section1 = {
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
			section2 = {
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
			section3 = {
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
			courseSections = [section1, section2, section3];
		});

		describe("writeCourseSections tests", function () {
			it("should write valid course sections", function () {
				let path: string = "./data/test/writeValidSections.json";
				return writeCourseSections(courseSections, path).then(() => {
					expect(existsSync(path)).to.be.true;
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
				return expect(result).to.deep.equal(["testElem"]);
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
			it("should parse a valid JSON file with one course section", function () {
				let data = fs.readFileSync("test/resources/json/utility/validJson.json").toString();
				return parseFileContent(data).then((output) => {
					expect(output).to.have.length(1);
					expect(output).to.deep.equal([
						{
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
						},
					]);
				});

			});

			it("should parse a valid JSON file for multiple course sections", function () {
				let data = fs.readFileSync("test/resources/json/utility/validJsonThreeSections.json").toString();
				return parseFileContent(data).then((output) => {
					expect(output).to.have.length(3);
					expect(output).to.have.deep.members(courseSections);
				});
			});
		});

		describe("parseFile tests", function () {
			it("should parse a zip with 1 file containing only 1 valid section", function () {
				let zip = getContentFromArchives("validJson.zip");
				let jsZip = new JSZip();
				return jsZip.loadAsync(zip, {base64: true}).then((jsZip2) => {
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
			it("should parse a zip with multiple valid sections", function () {
				let zip = getContentFromArchives("validJsonThreeSections.zip");
				let jsZip = new JSZip();
				return jsZip.loadAsync(zip, {base64: true}).then((jsZip2) => {
					let obj = jsZip2.file("validJsonThreeSections.json");
					expect(obj).to.be.not.null;
					if (obj) {
						parseFile(obj, "./data/validJson/courses/aanb002.json").then((output) => {
							expect(output).to.have.length(3);
							expect(output).to.have.deep.members(courseSections);
						});
					}
				});
			});

			it("should not parse from an invalid section in a zip", function () {
				let zip = getContentFromArchives("invalidJson.zip");
				let jsZip = new JSZip();
				return jsZip.loadAsync(zip, {base64: true}).then((jsZip2) => {
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

	describe("Add Datasets", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should add single dataset", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then((addedIDs) => {
				expect(addedIDs).to.deep.equal(["courses"]);
				expect(addedIDs).to.be.an.instanceOf(Array);
				expect(addedIDs).to.have.length(1);
			});
		});

		it("should add multiple dataset", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
				})
				.then((addedIDs) => {
					const expectedIDs: string[] = ["courses", "courses-2"];
					expect(addedIDs).to.be.an.instanceOf(Array);
					expect(addedIDs).to.have.length(2);
					expect(addedIDs).to.have.deep.members(expectedIDs);
				});
		});

		it("should ignore invalid sections when adding a dataset", function () {
			const validFile = getContentFromArchives("one-valid-course.zip");
			return facade
				.addDataset("valid-course", validFile, InsightDatasetKind.Courses)
				.then((addedIDs) => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "valid-course",
							kind: InsightDatasetKind.Courses,
							numRows: 1,
						},
					]);
					expect(insightDatasets).to.be.an.instanceOf(Array);
					expect(insightDatasets).to.have.length(1);
				});
		});

		it("rejects invalid id due to existing duplicate", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((addedIDs) => {
					expect(addedIDs).to.deep.equal(["courses"]);
					expect(addedIDs).to.be.an.instanceOf(Array);
					expect(addedIDs).to.have.length(1);
					return facade.addDataset("courses", courses, InsightDatasetKind.Courses);
				})
				.catch((err) => {
					expect(err).to.be.instanceOf(InsightError);
				});
		});

		it("rejects invalid id (only whitespace)", function () {
			return (
				facade
					.addDataset("   ", courses, InsightDatasetKind.Courses)
					.then()
					// Unsure if then() can be empty / need to throw something
					.catch((err) => {
						expect(err).to.be.instanceOf(InsightError);
					})
			);
		});

		it("should reject adding an id (only variations of whitespaces)", async function () {
			try {
				await facade.addDataset("   \t \n", courses, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should add datasets with ids that are not just whitespace", function () {
			return facade.addDataset(" \n c   \t ", courses, InsightDatasetKind.Courses).then((insightDatasets) => {
				expect(insightDatasets).to.be.an.instanceOf(Array);
				expect(insightDatasets).to.have.length(1);
				expect(insightDatasets).to.deep.equal([" \n c   \t "]);
			});
		});

		it("rejects invalid id (contains underscore)", function () {
			return (
				facade
					.addDataset("courses_reject", courses, InsightDatasetKind.Courses)
					.then()
					// Unsure if then() can be empty / need to throw something
					.catch((err) => {
						expect(err).to.be.instanceOf(InsightError);
					})
			);
		});

		it("should reject adding an id has any number of underscores", async function () {
			try {
				await facade.addDataset("courses_1_2", courses, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("rejects invalid file type", function () {
			const invalidFile = getContentFromArchives("invalidFile.json");
			return facade.addDataset("courses_reject", invalidFile, InsightDatasetKind.Courses).catch((err) => {
				expect(err).to.be.instanceOf(InsightError);
			});
		});

		it("rejects empty file", function () {
			const emptyFile = getContentFromArchives("empty-courses.zip");
			return (
				facade
					.addDataset("courses_reject", emptyFile, InsightDatasetKind.Courses)
					.then()
					// Unsure if then() can be empty / need to throw something
					.catch((err) => {
						expect(err).to.be.instanceOf(InsightError);
					})
			);
		});
	});

	describe("Remove Datasets", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should remove single dataset", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((addedIDs) => {
					return facade.removeDataset("courses");
				})
				.then((removedID) => {
					expect(removedID).to.be.a("string");
					expect(removedID).to.deep.equal("courses");
				});
		});

		it("reject removal of non-existent dataset", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.removeDataset("non-existent-courses");
				})
				.catch((err) => {
					expect(err).to.be.instanceOf(NotFoundError);
				});
		});

		it("rejects removal of invalid id (only whitespace)", function () {
			return (
				facade
					.removeDataset("   ")
					.then()
					// Unsure if then() can be empty / need to throw something
					.catch((err) => {
						expect(err).to.be.instanceOf(InsightError);
					})
			);
		});

		it("should reject whitespace-only ids", async function () {
			try {
				await facade.removeDataset("   \t \n");
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("rejects removal of invalid id (contains underscore)", function () {
			return (
				facade
					.removeDataset("courses_reject")
					.then()
					// Unsure if then() can be empty / need to throw something
					.catch((err) => {
						expect(err).to.be.instanceOf(InsightError);
					})
			);
		});

		it("should fulfill ids that are not just whitespace", async function () {
			await facade.addDataset(" \n c   \t ", courses, InsightDatasetKind.Courses);
			const insightDatasets = await facade.removeDataset(" \n c   \t ");
			return expect(insightDatasets).to.equal(" \n c   \t ");
		});

		it("should reject removing an id with any number of underscores", async function () {
			try {
				await facade.removeDataset("courses_1_2");
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});
	});

	describe("List Datasets", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should list no datasets", function () {
			return facade.listDatasets().then((insightDatasets) => {
				// insightDatasets is the actual value
				expect(insightDatasets).to.be.an.instanceOf(Array);
				expect(insightDatasets).to.have.length(0);
			});
		});
		it("should list one dataset", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((addedIDs) => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
					]);
					expect(insightDatasets).to.be.an.instanceOf(Array);
					expect(insightDatasets).to.have.length(1);
				});
		});
		it("should list multiple datasets", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
				})
				.then((addedIds) => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					const expectedDatasets = [
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
						{
							id: "courses-2",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
					];
					expect(insightDatasets).to.be.an.instanceOf(Array);
					expect(insightDatasets).to.have.length(2);
					expect(insightDatasets).to.have.deep.members(expectedDatasets);
				});
		});
	});

	describe("Dataset Validation", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should accept invalid courses when there are valid courses", async function () {
			courses = getContentFromArchives("valid-courses-some-sections.zip");
			const insightDatasets = await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
			return expect(insightDatasets).to.deep.equal(["courses"]);
		});

		it("should reject zips without a courses directory", async function () {
			courses = getContentFromArchives("invalid-courses-typo.zip");
			try {
				await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should reject zips with zero valid sections", async function () {
			courses = getContentFromArchives("invalid-courses-zero-sections.zip");
			try {
				await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});
	});

	describe("Perform Query", function () {
		let facade: IInsightFacade;

		before(async function () {
			clearDisk();
			facade = new InsightFacade();
			courses = getContentFromArchives("courses.zip");
			courses2 = getContentFromArchives("ten-courses.zip");
			await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
			await facade.addDataset("courses-2", courses2, InsightDatasetKind.Courses);
		});

		it("should run dynamic folder tests for performQuery", function () {
			// Assert actual result is correct, regardless of order
			function assertResult(actual: any, expected: Awaited<Output>): void | PromiseLike<void> {
				expect(actual).to.have.deep.members(expected);
			}

			// Assert actual error is of expected type
			function assertError(actual: any, expected: Error, input: Input): void | PromiseLike<void> {
				if (expected === "InsightError") {
					expect(actual).to.be.instanceof(InsightError);
				} else if (expected === "ResultTooLargeError") {
					expect(actual).to.be.instanceof(ResultTooLargeError);
				} else if (expected === "NotFoundError") {
					expect(actual).to.be.instanceof(NotFoundError);
				} else {
					// this should be unreachable
					expect.fail("UNEXPECTED ERROR");
				}
			}

			// Tests to dynamically check PerformQuery specifications
			folderTest<Input, Output, Error>(
				"PerformQuery Dynamic Tests",
				(input: Input): Output => facade.performQuery(input),
				"./test/resources/json/performQuery",
				{
					errorValidator: (error): error is Error =>
						error === "InsightError" || error === "ResultTooLargeError" || error === "NotFoundError",
					assertOnError: assertError,
					assertOnResult: assertResult,
				}
			);
		});
	});
});
