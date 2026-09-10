import catalog from "./homeFeedItemCatalog.json";
import type { HomePost } from "../shared-home/sharedLifeTypes";
import type { SharedHomeDelivery } from "../shared-home/sharedHomeTypes";
export type HomeItemExample = {
  id: string;
  typeId: string;
  name: string;
  family:
    "Moment" | "Contribution" | "Personal message" | "Invitation / request";
  question: string;
  tags: string[];
  revision: number;
  note: string;
  post?: HomePost;
  delivery?: SharedHomeDelivery;
};
// JSON is also consumed by the browser manager; coverage tests validate its contract.
export const homeFeedItemExamples = catalog.variants as HomeItemExample[];
export const homeFeedReviewTypes = catalog.types;
