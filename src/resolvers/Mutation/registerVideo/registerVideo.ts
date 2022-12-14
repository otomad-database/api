import { GraphQLError } from "graphql";
import { Driver as Neo4jDriver } from "neo4j-driver";
import { DataSource, In } from "typeorm";
import { ulid } from "ulid";

import { NicovideoVideoSource } from "../../../db/entities/nicovideo_video_sources.js";
import { Semitag } from "../../../db/entities/semitags.js";
import { Tag } from "../../../db/entities/tags.js";
import { VideoTag } from "../../../db/entities/video_tags.js";
import { VideoThumbnail } from "../../../db/entities/video_thumbnails.js";
import { VideoTitle } from "../../../db/entities/video_titles.js";
import { Video } from "../../../db/entities/videos.js";
import { MutationResolvers, RegisterVideoInputSourceType } from "../../../graphql.js";
import { parseGqlIDs } from "../../../utils/id.js";
import { isValidNicovideoSourceId } from "../../../utils/isValidNicovideoSourceId.js";
import { VideoModel } from "../../Video/model.js";

export const registerVideoInNeo4j = async (neo4jDriver: Neo4jDriver, rels: { videoId: string; tagId: string }[]) => {
  const session = neo4jDriver.session();
  try {
    const tx = session.beginTransaction();
    for (const rel of rels) {
      const tagId = rel.videoId;
      const videoId = rel.tagId;
      tx.run(
        `
          MERGE (v:Video {id: $video_id})
          MERGE (t:Tag {id: $tag_id})
          MERGE r=(v)-[:TAGGED_BY]->(t)
          RETURN r
          `,
        { tag_id: tagId, video_id: videoId }
      );
    }
    await tx.commit();
  } finally {
    await session.close();
  }
};

export const registerVideo = ({ dataSource, neo4jDriver }: { dataSource: DataSource; neo4jDriver: Neo4jDriver }) =>
  (async (_parent, { input }) => {
    // validity check
    const nicovideoSourceIds = input.sources
      .filter((v) => v.type === RegisterVideoInputSourceType.Nicovideo)
      .map(({ sourceId }) => sourceId.toLocaleLowerCase());

    for (const id of nicovideoSourceIds) {
      if (!isValidNicovideoSourceId(id)) throw new GraphQLError(`"${id}" is invalid source id for niconico source`);
    }

    const video = new Video();
    video.id = ulid();

    const titles: VideoTitle[] = [];
    const primaryTitle = new VideoTitle();
    primaryTitle.id = ulid();
    primaryTitle.title = input.primaryTitle;
    primaryTitle.video = video;
    primaryTitle.isPrimary = true;
    titles.push(primaryTitle);
    for (const extraTitle of input.extraTitles) {
      const title = new VideoTitle();
      title.id = ulid();
      title.title = extraTitle;
      title.video = video;
      title.isPrimary = false;
      titles.push(title);
    }

    const primaryThumbnail = new VideoThumbnail();
    primaryThumbnail.id = ulid();
    primaryThumbnail.imageUrl = input.primaryThumbnail;
    primaryThumbnail.video = video;
    primaryThumbnail.primary = true;

    const tags = await dataSource.getRepository(Tag).findBy({ id: In(parseGqlIDs("Tag", input.tags)) });
    if (tags.length !== input.tags.length) {
      throw new GraphQLError("Some of tag IDs are wrong");
    }
    const videoTags = tags.map((tag) => {
      const videoTag = new VideoTag();
      videoTag.id = ulid();
      videoTag.video = video;
      videoTag.tag = tag;
      return videoTag;
    });

    const nicovideoSources = nicovideoSourceIds.map((id) => {
      const s = new NicovideoVideoSource();
      s.id = ulid();
      s.video = video;
      s.sourceId = id.toLowerCase();
      return s;
    });

    const semitags = input.semitags.map((name) => {
      const semitag = new Semitag();
      semitag.id = ulid();
      semitag.name = name;
      semitag.video = video;
      return semitag;
    });

    await dataSource.transaction(async (manager) => {
      await manager.getRepository(Video).insert(video);
      await manager.getRepository(VideoTitle).insert(titles);
      await manager.getRepository(VideoThumbnail).insert(primaryThumbnail);
      await manager.getRepository(VideoTag).insert(videoTags);
      await manager.getRepository(NicovideoVideoSource).insert(nicovideoSources);
      await manager.getRepository(Semitag).insert(semitags);
    });

    await registerVideoInNeo4j(
      neo4jDriver,
      videoTags.map(({ tag, video }) => ({ tagId: tag.id, videoId: video.id }))
    );

    return {
      video: new VideoModel(video),
    };
  }) satisfies MutationResolvers["registerVideo"];
