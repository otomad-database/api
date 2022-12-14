import { GraphQLError } from "graphql";
import { Driver as Neo4jDriver } from "neo4j-driver";
import { DataSource } from "typeorm";

import { VideoTag } from "../../../db/entities/video_tags.js";
import { MutationResolvers } from "../../../graphql.js";
import { parseGqlID } from "../../../utils/id.js";
import { TagModel } from "../../Tag/model.js";
import { VideoModel } from "../../Video/model.js";

export const removeInNeo4j = async (driver: Neo4jDriver, { videoId, tagId }: { videoId: string; tagId: string }) => {
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (v:Video {id: $video_id})
      MATCH (t:Tag {id: $tag_id})
      MATCH (v)-[r:TAGGED_BY]->(t)
      DELETE r
      `,
      { tag_id: tagId, video_id: videoId }
    );
  } finally {
    await session.close();
  }
};

export const removeTagFromVideo = ({ dataSource, neo4jDriver }: { dataSource: DataSource; neo4jDriver: Neo4jDriver }) =>
  (async (_parent, { input: { tagId: tagGqlId, videoId: videoGqlId } }, { user }) => {
    if (!user) throw new GraphQLError("required to sign in");

    const videoId = parseGqlID("Video", videoGqlId);
    const tagId = parseGqlID("Tag", tagGqlId);

    const repoVideoTag = dataSource.getRepository(VideoTag);

    const tagging = await repoVideoTag.findOne({
      where: { video: { id: videoId }, tag: { id: tagId } },
      relations: { tag: true, video: true },
    });
    if (!tagging) throw new GraphQLError(`"tag:${tagId}" is not tagged to "video:${videoId}"`);

    await repoVideoTag.remove(tagging);

    await removeInNeo4j(neo4jDriver, {
      videoId: tagging.video.id,
      tagId: tagging.tag.id,
    });

    return {
      video: new VideoModel(tagging.video),
      tag: new TagModel(tagging.tag),
    };
  }) satisfies MutationResolvers["removeTagFromVideo"];
