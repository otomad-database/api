import { type Resolvers } from "../graphql/resolvers.js";
import { registerTag, searchTags, tag, tags } from "./tags.js";
import { user, whoami } from "./users.js";
import { registerVideo, searchVideos, tagVideo, untagVideo, video, videos } from "./videos.js";
import { mylist, createMylist, addVideoToMylist } from "./mylists.js";

export const resolvers: Resolvers = {
  Query: {
    // findNiconicoSource,　// 最悪まだ実装しなくてもいい
    // niconicoSource,　// 最悪まだ実装しなくてもいい
    searchTags,
    searchVideos,
    tag,
    tags: tags,
    user,
    video,
    videos,
    whoami,
    mylist,
  },
  Mutation: {
    registerTag,
    registerVideo,
    tagVideo,
    untagVideo,
    createMylist,
    addVideoToMylist,
  },
};
