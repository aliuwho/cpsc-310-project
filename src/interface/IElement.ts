import {ISection} from "./ISection";
import {InsightDataset} from "../controller/IInsightFacade";

export interface IElement {
	sections: ISection[];
	info: InsightDataset;
}
