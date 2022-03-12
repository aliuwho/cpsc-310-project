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
import chaiAsPromised from "chai-as-promised";
import {describe} from "mocha";
import {folderTest} from "@ubccpsc310/folder-test";

use(chaiAsPromised);

describe("InsightFacade", function () {
	let courses: string;
	let rooms: string;

	before(function () {
		courses = getContentFromArchives("courses.zip");
		rooms = getContentFromArchives("rooms.zip");
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
				.then(() => {
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

	describe("Add Datasets for Room (C2)", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should add single dataset - rooms in 1 building", function () {
			const validFile = getContentFromArchives("one-building.zip");
			return facade
				.addDataset("one-building-with-valid-rooms", validFile, InsightDatasetKind.Rooms)
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "one-building-with-valid-rooms",
							kind: InsightDatasetKind.Rooms,
							numRows: 5,
						},
					]);
					expect(insightDatasets).to.be.an.instanceOf(Array);
					expect(insightDatasets).to.have.length(1);
				});
		});

		it("should add single dataset - rooms", function () {
			return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms).then((addedIDs) => {
				expect(addedIDs).to.deep.equal(["rooms"]);
				expect(addedIDs).to.be.an.instanceOf(Array);
				expect(addedIDs).to.have.length(1);
			});
		});

		it("should add multiple dataset - rooms", function () {
			return facade
				.addDataset("rooms", rooms, InsightDatasetKind.Rooms)
				.then(() => {
					return facade.addDataset("rooms-2", rooms, InsightDatasetKind.Rooms);
				})
				.then((addedIDs) => {
					const expectedIDs: string[] = ["rooms", "rooms-2"];
					expect(addedIDs).to.be.an.instanceOf(Array);
					expect(addedIDs).to.have.length(2);
					expect(addedIDs).to.have.deep.members(expectedIDs);
				});
		});

		it("should ignore additional unlinked buildings when adding a room - rooms", function () {
			const validFile = getContentFromArchives("additional-unlinked-buildings.zip");
			return facade
				.addDataset("valid-rooms", validFile, InsightDatasetKind.Rooms)
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([
						{
							id: "valid-rooms",
							kind: InsightDatasetKind.Rooms,
							numRows: 364,
						},
					]);
					expect(insightDatasets).to.be.an.instanceOf(Array);
					expect(insightDatasets).to.have.length(1);
				});
		});

		it("rejects invalid id due to existing duplicate - rooms", function () {
			return facade
				.addDataset("rooms", rooms, InsightDatasetKind.Rooms)
				.then((addedIDs) => {
					expect(addedIDs).to.deep.equal(["rooms"]);
					expect(addedIDs).to.be.an.instanceOf(Array);
					expect(addedIDs).to.have.length(1);
					return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				})
				.catch((err) => {
					expect(err).to.be.instanceOf(InsightError);
				});
		});

		it("rejects invalid id (only whitespace) - rooms", function () {
			return facade
				.addDataset("   ", rooms, InsightDatasetKind.Rooms)
				.then()
				.catch((err) => {
					expect(err).to.be.instanceOf(InsightError);
				});
		});

		it("should reject adding an id (only variations of whitespaces) - rooms", async function () {
			try {
				await facade.addDataset("   \t \n", rooms, InsightDatasetKind.Rooms);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should add datasets with ids that are not just whitespace - rooms", function () {
			return facade.addDataset(" \n c   \t ", rooms, InsightDatasetKind.Rooms).then((insightDatasets) => {
				expect(insightDatasets).to.be.an.instanceOf(Array);
				expect(insightDatasets).to.have.length(1);
				expect(insightDatasets).to.deep.equal([" \n c   \t "]);
			});
		});

		it("rejects invalid id (contains underscore) - rooms", function () {
			return (
				facade
					.addDataset("courses_reject", rooms, InsightDatasetKind.Rooms)
					.then()
					// Unsure if then() can be empty / need to throw something
					.catch((err) => {
						expect(err).to.be.instanceOf(InsightError);
					})
			);
		});

		it("should reject adding an id has any number of underscores - rooms", async function () {
			try {
				await facade.addDataset("rooms_1_2", rooms, InsightDatasetKind.Rooms);
				expect.fail("Should have rejected!");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("rejects 0 valid rooms - rooms", function () {
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

		it("rejects 0 valid rooms - rooms", function () {
			const emptyFile = getContentFromArchives("no-rooms.zip");
			return (
				facade
					.addDataset("rooms_reject", emptyFile, InsightDatasetKind.Rooms)
					.then()
					// Unsure if then() can be empty / need to throw something
					.catch((err) => {
						expect(err).to.be.instanceOf(InsightError);
					})
			);
		});

		it("rejects invalid index htm file - rooms", function () {
			const invalidIndexFile = getContentFromArchives("invalid-index-htm.zip");
			return (
				facade
					.addDataset("rooms_reject", invalidIndexFile, InsightDatasetKind.Rooms)
					.then()
					// Unsure if then() can be empty / need to throw something
					.catch((err) => {
						expect(err).to.be.instanceOf(InsightError);
					})
			);
		});

		it("should reject zips without a rooms directory - rooms", function () {
			const invalidRoomsTypoFile = getContentFromArchives("invalid-rooms-typo.zip");
			return (
				facade
					.addDataset("rooms_reject", invalidRoomsTypoFile, InsightDatasetKind.Rooms)
					.then()
					// Unsure if then() can be empty / need to throw something
					.catch((err) => {
						expect(err).to.be.instanceOf(InsightError);
					})
			);
		});

		it("should reject zips with zero valid sections", async function () {
			const invalidRoomsTypoFile = getContentFromArchives("invalid-rooms-typo.zip");
			return (
				facade
					.addDataset("rooms_reject", invalidRoomsTypoFile, InsightDatasetKind.Rooms)
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
				.then(() => {
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
				.then(() => {
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
				.then(() => {
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

	describe("PerformQuery", () => {
		let insightFacade: IInsightFacade;
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
			clearDisk();

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("courses", getContentFromArchives("courses.zip"), InsightDatasetKind.Courses),
				insightFacade.addDataset(
					"courses-2",
					getContentFromArchives("ten-courses.zip"),
					InsightDatasetKind.Courses
				),
				insightFacade.addDataset("rooms", rooms, InsightDatasetKind.Rooms),
				insightFacade.addDataset(
					"no-seat-rooms",
					getContentFromArchives("valid-rooms-no-seats.zip"),
					InsightDatasetKind.Rooms),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			clearDisk();
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/json/performQuery",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError(actual, expected) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
				assertOnResult(actual, expected) {
					expect(actual).to.have.deep.members(expected);
					expect(actual).to.be.same.length(expected.length);
				},
			}
		);
	});
});
