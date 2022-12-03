import { GraphQLError } from "graphql";
import { In, Like } from "typeorm";
import { ulid } from "ulid";
import { dataSource } from "../db/data-source.js";
import { Tag } from "../db/entities/tags.js";
import { Video } from "../db/entities/videos.js";
import { VideoSource } from "../db/entities/video_sources.js";
import { VideoTag } from "../db/entities/video_tags.js";
import { VideoThumbnail } from "../db/entities/video_thumbnails.js";
import { VideoTitle } from "../db/entities/video_titles.js";
import { MutationResolvers, QueryResolvers } from "../graphql/resolvers.js";
import { tagEntityToGraphQLTag } from "./tags.js";

export function videoEntityToGraphQLVideo(video: Video) {
  return {
    id: "video:" + video.id,
    title: video.titles.find((t) => t.isPrimary)?.title!,
    titles: video.titles.map((t) => ({ title: t.title, primary: t.isPrimary })),
    thumbnailUrl: video.thumbnails.find((t) => t.primary)?.imageUrl!,
    thumbnails: video.thumbnails.map((t) => ({ imageUrl: t.imageUrl, primary: t.primary })),
    tags: [],
    hasTag: false,
    history: [],
    registeredAt: video.createdAt,
  };
}

export const video: QueryResolvers["video"] = async (_parent, { id }, _context, _info) => {
  const video = await dataSource.getRepository(Video).findOne({
    relations: {
      sources: true,
      thumbnails: true,
      titles: true,
    },
    where: { id },
  });
  if (!video) throw new GraphQLError("Not Found");

  return videoEntityToGraphQLVideo(video);
};

export const videos: QueryResolvers["videos"] = async (parent, args, context, info) => {
  const videos = await dataSource.getRepository(Video).find();

  return { nodes: videos.map((v) => videoEntityToGraphQLVideo(v)) };
};

export const registerVideo: MutationResolvers["registerVideo"] = async (_parent, { input }, _context, _info) => {
  const video = new Video();
  video.id = ulid();
  let titles: VideoTitle[] = [];
  const primaryTitle = new VideoTitle();
  primaryTitle.id = ulid();
  primaryTitle.title = input.primaryTitle;
  primaryTitle.video = video;
  primaryTitle.isPrimary = true;
  titles.push(primaryTitle);
  if (input.extraTitles != null) {
    for (const extraTitle of input.extraTitles) {
      let title = new VideoTitle();
      title.id = ulid();
      title.title = extraTitle;
      title.video = video;
      title.isPrimary = false;
      titles.push(title);
    }
  }
  const primaryThumbnail = new VideoThumbnail();
  primaryThumbnail.id = ulid();
  primaryThumbnail.imageUrl = input.primaryThumbnail;
  primaryThumbnail.video = video;
  const sources = input.sources.map((source) => {
    const s = new VideoSource();
    s.id = ulid();
    s.video = video;
    if (source.type !== "NICOVIDEO") {
      throw new Error("TODO: Add source type to VideoSource");
    }
    s.sourceVideoId = source.sourceId;
    return s;
  });

  await dataSource.transaction(async (manager) => {
    await manager.getRepository(Video).insert(video);
    await manager.getRepository(VideoTitle).insert(titles);
    await manager.getRepository(VideoThumbnail).insert(primaryThumbnail);
    await manager.getRepository(VideoSource).insert(sources);
  });
  return {
    video: {
      id: "video:" + video.id,
      title: primaryTitle.title,
      titles: titles.map((t) => ({
        title: t.title,
        primary: t.isPrimary,
      })),
      thumbnailUrl: primaryThumbnail.imageUrl,
      thumbnails: [
        {
          imageUrl: primaryThumbnail.imageUrl,
          primary: true,
        },
      ],
      tags: [],
      hasTag: false,
      history: [],
      registeredAt: video.createdAt,
    },
  };
};

export const searchVideos: QueryResolvers["searchVideos"] = async (
  _parent,
  { limit, query, skip },
  _context,
  _info
) => {
  const videoTitles = await dataSource
    .getRepository(VideoTitle)
    .createQueryBuilder("videoTitle")
    .where({ name: Like(`%${query}%`) })
    .leftJoinAndSelect("videoTitle.video", "videos")
    .distinctOn(["videoTitle.video.id"])
    .getMany();

  const videos = await dataSource.getRepository(Video).find({
    where: { id: In(videoTitles.map((t) => t.video.id)) },
    relations: ["sources", "thumbnails", "titles"],
  });

  return {
    result: videoTitles.map((t) => {
      const video = videos.find((v) => v.id === t.video.id);
      if (!video) throw new Error(`Failed to find tag ${t.video.id}`);
      return {
        matchedTitle: t.title,
        video: videoEntityToGraphQLVideo(video),
      };
    }),
  };
};

export const tagVideo: MutationResolvers["tagVideo"] = async (
  parent,
  { input: { tagId, videoId } },
  { user },
  info
) => {
  const video = await dataSource.getRepository(Video).findOne({ where: { id: videoId } });
  if (video == null) throw new GraphQLError("Video Not Found");
  const tag = await dataSource.getRepository(Tag).findOne({ where: { id: tagId } });
  if (tag == null) throw new GraphQLError("Tag Not Found");
  const videoTag = new VideoTag();
  videoTag.id = ulid();
  videoTag.video = video;
  videoTag.tag = tag;
  await dataSource.getRepository(VideoTag).insert(videoTag);

  return {
    createdAt: new Date(),
    id: videoTag.id,
    tag: tagEntityToGraphQLTag(tag),
    user: {
      displayName: "stub",
      icon: "stub",
      id: "stub",
      name: "stub",
    },
    video: videoEntityToGraphQLVideo(video),
  };
};

export const untagVideo: MutationResolvers["untagVideo"] = async (
  _parent,
  { input: { tagId, videoId } },
  _context,
  _info
) => {
  const repository = dataSource.getRepository(VideoTag);

  const videoTag = await repository.findOne({
    relations: { video: { sources: true, thumbnails: true, titles: true }, tag: { tagNames: true, tagParents: true } },
    where: { video: { id: videoId }, tag: { id: tagId } },
  });
  if (!videoTag) {
    throw new GraphQLError("Not Found");
  }

  await repository.remove(videoTag);

  return {
    createdAt: new Date(),
    id: videoTag.id,
    tag: tagEntityToGraphQLTag(videoTag.tag),
    user: {
      displayName: "stub",
      icon: "stub",
      id: "stub",
      name: "stub",
    },
    video: videoEntityToGraphQLVideo(videoTag.video),
  };
};
