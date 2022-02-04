import {ISection} from "./ISection";
import {InsightDataset} from "../IInsightFacade";

export interface IElement {
	sections: ISection[];
	info: InsightDataset;
}
