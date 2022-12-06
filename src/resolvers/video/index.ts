import { GraphQLError } from "graphql";

import { Resolvers } from "~/codegen/resolvers.js";
import { dataSource } from "~/db/data-source.js";
import { VideoTag } from "~/db/entities/video_tags.js";
import { VideoThumbnail } from "~/db/entities/video_thumbnails.js";
import { VideoTitle as VideoTitleEntity } from "~/db/entities/video_titles.js";
import { addIDPrefix, ObjectType } from "~/utils/id.js";

export const resolveVideo: Resolvers["Video"] = {
  id: ({ id }) => addIDPrefix(ObjectType.Video, id),

  title: async ({ id: videoId }) => {
    const title = await dataSource
      .getRepository(VideoTitleEntity)
      .findOne({ where: { video: { id: videoId }, isPrimary: true } });
    if (!title) throw new GraphQLError(`primary title for video ${videoId} is not found`);

    return title.title;
  },
  titles: async ({ id: videoId }) => {
    const titles = await dataSource.getRepository(VideoTitleEntity).find({ where: { video: { id: videoId } } });
    return titles.map((t) => ({
      title: t.title,
      primary: t.isPrimary,
    }));
  },

  thumbnails: async ({ id: videoId }) => {
    const thumbnails = await dataSource.getRepository(VideoThumbnail).find({ where: { video: { id: videoId } } });
    return thumbnails.map((t) => ({ imageUrl: t.imageUrl, primary: t.primary }));
  },
  thumbnailUrl: async ({ id: videoId }) => {
    const thumbnail = await dataSource
      .getRepository(VideoThumbnail)
      .findOne({ where: { video: { id: videoId }, primary: true } });

    if (!thumbnail) throw new GraphQLError(`primary thumbnail for video ${videoId} is not found`);
    return thumbnail.imageUrl;
  },

  tags: async ({ id: videoId }) => {
    const tags = await dataSource.getRepository(VideoTag).find({
      where: { video: { id: videoId } },
      relations: {
        tag: true,
      },
    });
    return tags.map(({ tag }) => ({ id: tag.id, meaningless: tag.meaningless }));
  },
  hasTag: async ({ id: videoId }, { id: tagId }) => {
    return await dataSource
      .getRepository(VideoTag)
      .findOne({ where: { video: { id: videoId }, tag: { id: tagId } } })
      .then((v) => !!v);
  },

  history: () => [],
};