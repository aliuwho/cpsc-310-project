import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect} from "chai";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {folderTest} from "@ubccpsc310/folder-test";

// For folderTest
type Input = unknown;
type Output = Promise<InsightResult[]>;
type Error = "InsightError" | "ResultTooLargeError";

describe("InsightFacade", function(){
	let courses: string;
	let courses2: string;

	before(function(){
		courses =  getContentFromArchives("courses.zip");
	});

	describe("Add Datasets", function(){
		let facade: IInsightFacade;

		beforeEach(function(){
			clearDisk();
			facade = new InsightFacade();
		});

		it("should add single dataset", function() {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((addedIDs) => {
					expect(addedIDs).to.deep.equal(["courses"]);
					expect(addedIDs).to.be.an.instanceOf(Array);
					expect(addedIDs).to.have.length(1);
				});
		});

		it("should add multiple dataset", function() {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
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

		it("should add valid dataset", function() {
			const validFile = getContentFromArchives("one-valid-course.zip");
			return facade.addDataset("valid-course", validFile, InsightDatasetKind.Courses)
				.then((addedIDs) => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([{
						id: "valid-course",
						kind: InsightDatasetKind.Courses,
						numRows: 1,
					}]);
					expect(insightDatasets).to.be.an.instanceOf(Array);
					expect(insightDatasets).to.have.length(1);
				});
		});

		it("rejects invalid id due to existing duplicate", function() {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
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

		it("rejects invalid id (only whitespace)", function() {
			return facade.addDataset("   ", courses, InsightDatasetKind.Courses)
				.then()
				// Unsure if then() can be empty / need to throw something
				.catch((err) => {
					expect(err).to.be.instanceOf(InsightError);
				});
		});

		it("rejects invalid id (contains underscore)", function() {
			return facade.addDataset("courses_reject", courses, InsightDatasetKind.Courses)
				.then()
				// Unsure if then() can be empty / need to throw something
				.catch((err) => {
					expect(err).to.be.instanceOf(InsightError);
				});
		});

		it("rejects invalid file type", function(){
			const invalidFile =  getContentFromArchives("invalidFile.json");
			return facade.addDataset("courses_reject", invalidFile, InsightDatasetKind.Courses)
				.then()
				// Unsure if then() can be empty / need to throw something
				.catch((err) => {
					expect(err).to.be.instanceOf(InsightError);
				});
		});

		it("rejects empty file", function(){
			const emptyFile =  getContentFromArchives("empty-courses.zip");
			return facade.addDataset("courses_reject", emptyFile, InsightDatasetKind.Courses)
				.then()
				// Unsure if then() can be empty / need to throw something
				.catch((err) => {
					expect(err).to.be.instanceOf(InsightError);
				});
		});
	});

	describe("Remove Datasets", function(){
		let facade: IInsightFacade;

		beforeEach(function(){
			clearDisk();
			facade = new InsightFacade();
		});

		it("should remove single dataset", function() {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((addedIDs) => {
					return facade.removeDataset("courses");
				})
				.then((removedID) => {
					expect(removedID).to.be.a("string");
					expect(removedID).to.deep.equal("courses");
				});
		});

		it("reject removal of non-existent dataset", function() {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.removeDataset("non-existent-courses");
				})
				.catch((err) => {
					expect(err).to.be.instanceOf(NotFoundError);
				});
		});

		it("rejects removal of invalid id (only whitespace)", function() {
			return facade.removeDataset("   ")
				.then()
				// Unsure if then() can be empty / need to throw something
				.catch((err) => {
					expect(err).to.be.instanceOf(InsightError);
				});
		});

		it("rejects removal of invalid id (contains underscore)", function() {
			return facade.removeDataset("courses_reject")
				.then()
				// Unsure if then() can be empty / need to throw something
				.catch((err) => {
					expect(err).to.be.instanceOf(InsightError);
				});
		});
	});

	describe("List Datasets", function(){
		let facade: IInsightFacade;

		beforeEach(function(){
			clearDisk();
			facade = new InsightFacade();
		});

		it("should list no datasets", function(){
			return facade.listDatasets().then((insightDatasets) => {
				// insightDatasets is the actual value
				expect(insightDatasets).to.be.an.instanceOf(Array);
				expect(insightDatasets).to.have.length(0);
			});
		});
		it("should list one dataset", function(){
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((addedIDs) => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([{
						id: "courses",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					}]);
					expect(insightDatasets).to.be.an.instanceOf(Array);
					expect(insightDatasets).to.have.length(1);
				});
		});
		it("should list multiple datasets", function(){
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(()=>{
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
						}
					];
					expect(insightDatasets).to.be.an.instanceOf(Array);
					expect(insightDatasets).to.have.length(2);
					expect(insightDatasets).to.have.deep.members(expectedDatasets);
				});
		});
	});

	describe("Perform Query", function(){
		let facade: IInsightFacade;

		before(function(){
			clearDisk();
			facade = new InsightFacade();
			courses2 = getContentFromArchives("ten-courses.zip");
			return facade.addDataset("courses", courses,InsightDatasetKind.Courses).
				then(()=>{
					return facade.addDataset("courses-2", courses2, InsightDatasetKind.Courses);
				});
		});

		folderTest<Input, Output, Error>(
			"Perform Query on Datasets",
			(input: Input): Output => {
				return facade.performQuery(input);
			},
			"./test/resources/json",
			{
				errorValidator: (error): error is Error =>
					error === "InsightError" || error === "ResultTooLargeError",
				assertOnError: ((actual, expected) => { // Check parameter order
					if (expected === "InsightError") {
						expect(actual).to.be.instanceof(InsightError);
					} else if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						// this should be unreachable
						expect.fail("UNEXPECTED ERROR");
					}
				})
			}
		);
	});
});
