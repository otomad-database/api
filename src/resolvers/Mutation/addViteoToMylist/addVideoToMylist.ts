import { GraphQLError } from "graphql";
import { Driver as Neo4jDriver } from "neo4j-driver";
import { DataSource } from "typeorm";
import { ulid } from "ulid";

import { MylistRegistration } from "../../../db/entities/mylist_registrations.js";
import { Mylist } from "../../../db/entities/mylists.js";
import { Video } from "../../../db/entities/videos.js";
import { MutationResolvers } from "../../../graphql.js";
import { addMylistRegistration as addMylistRegistrationInNeo4j } from "../../../neo4j/addMylistRegistration.js";
import { GraphQLNotFoundError, parseGqlID } from "../../../utils/id.js";
import { MylistRegistrationModel } from "../../MylistRegistration/model.js";

export const addVideoToMylist = ({ dataSource, neo4jDriver }: { dataSource: DataSource; neo4jDriver: Neo4jDriver }) =>
  (async (_parent, { input: { mylistId: mylistGqlId, note, videoId: videoGqlId } }, { user }) => {
    if (!user) throw new GraphQLError("need to authenticate");

    const mylistId = parseGqlID("mylist", mylistGqlId);
    const videoId = parseGqlID("video", videoGqlId);

    const registration = new MylistRegistration();
    registration.id = ulid();

    await dataSource.transaction(async (manager) => {
      const repoVideo = manager.getRepository(Video);
      const repoMylist = manager.getRepository(Mylist);
      const repoRegistration = manager.getRepository(MylistRegistration);

      const video = await repoVideo.findOne({ where: { id: videoId } });
      if (!video) throw GraphQLNotFoundError("video", videoId);

      const mylist = await repoMylist.findOne({ where: { id: mylistId }, relations: { holder: true } });
      if (!mylist) throw GraphQLNotFoundError("mylist", mylistId);
      if (mylist.holder.id !== user.id) throw new GraphQLError(`mylist "${mylistGqlId}" is not holded by you`);

      if (await repoRegistration.findOneBy({ mylist: { id: mylistId }, video: { id: videoId } }))
        throw new GraphQLError(`"${videoGqlId}" is already registered in "${mylistGqlId}"`);

      registration.video = video;
      registration.mylist = mylist;
      registration.note = note ?? null;

      await repoRegistration.insert(registration);
    });

    await addMylistRegistrationInNeo4j({ neo4jDriver })(registration);

    return {
      registration: new MylistRegistrationModel({
        id: registration.id,
        note: registration.note,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
        mylistId: registration.mylist.id,
        videoId: registration.video.id,
      }),
    };
  }) satisfies MutationResolvers["addVideoToMylist"];