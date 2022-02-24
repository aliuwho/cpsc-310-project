import {InsightDataset} from "../IInsightFacade";
import {IKind} from "./IKind";

export interface IElement {
	kinds: IKind[];
	info: InsightDataset;
}
