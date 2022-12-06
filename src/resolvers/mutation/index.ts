import { type Resolvers } from "~/codegen/resolvers.js";

import { registerTag } from "./register_tag.js";
import { registerVideo } from "./register_videos.js";
import { tagVideo } from "./tag_video.js";
import { untagVideo } from "./untag_video.js";

export const mutation: Resolvers["Mutation"] = {
  registerTag,
  registerVideo,
  tagVideo,
  untagVideo,
};