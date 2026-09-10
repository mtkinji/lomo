export type HomeAttachment =
  | { kind: "place"; name: string; latitude: number; longitude: number }
  | { kind: "outing"; title: string }
  | { kind: "goal_completed"; title: string };
export type HomeAudience = "household" | "people" | "followers";
export type HomePhoto = {
  id: string;
  uri: string;
  alt: string;
  width?: number;
  height?: number;
};
export type HomeDraft = {
  id: string;
  text: string;
  audience: HomeAudience;
  householdId: string | null;
  recipientIds: string[];
  photos: HomePhoto[];
  attachment: HomeAttachment | null;
};
export type HomeChoreUpdate = {
  items: {
    occurrenceId: string;
    title: string;
    state: "completed" | "waiting_approval";
    scheduledDate: string | null;
    reportedEarlier: boolean;
  }[];
};
export type HomePost = {
  kind?: "moment" | "chore_update";
  choreUpdate?: HomeChoreUpdate | null;
  id: string;
  authorId: string | null;
  authorName: string;
  text: string;
  audience: HomeAudience;
  householdId: string | null;
  householdName: string | null;
  attachment: HomeAttachment | null;
  media: { path: string; alt: string; width?: number; height?: number }[];
  createdAt: string;
  updatedAt: string;
  saved?: boolean;
  savedAt?: string;
  savedToExplore?: boolean;
  seen?: boolean;
  reactors?: HomePerson[];
  replyPreview?: HomeReply | null;
  reactionCount: number;
  replyCount: number;
  myReaction: string | null;
};
export type HomePerson = { id: string; name: string };
export type HomeBootstrap = {
  households: HomePerson[];
  people: HomePerson[];
  householdChoices: HomePerson[];
};
export type HomeConnection = {
  id: string;
  followerId: string;
  followerName: string;
  targetUserId: string | null;
  targetHouseholdId: string | null;
  targetName: string;
  incoming: boolean;
  state: "pending" | "accepted";
};
export type HomeReply = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
};
export type HomeConversation = { post: HomePost; replies: HomeReply[] };
export type HomeFeedFilter = {
  householdId?: string;
  authorId?: string;
  saved?: boolean;
  library?: boolean;
  places?: boolean;
  collectionId?: string;
  query?: string;
  before?: string;
  beforeId?: string;
};

export type HomeCatchUp = {
  id: string;
  name: string;
  kind: "person" | "household";
  count: number;
};
export type HomeCollection = { id: string; name: string; included?: boolean };
