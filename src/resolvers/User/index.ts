import { GraphQLError } from "graphql";
import { DataSource, In } from "typeorm";

import { Mylist, MylistShareRange } from "../../db/entities/mylists.js";
import { UserRole } from "../../db/entities/users.js";
import { MylistShareRange as GraphQLMylistShareRange, Resolvers } from "../../graphql.js";
import { buildGqlId, parseGqlID } from "../../utils/id.js";
import { MylistModel } from "../Mylist/model.js";
import { resolveUserLikes } from "./likes.js";

export const convertMylistShareRange = (ranges: GraphQLMylistShareRange[]) =>
  ranges.map((r) => {
    switch (r) {
      case GraphQLMylistShareRange.Public:
        return MylistShareRange.PUBLIC;
      case GraphQLMylistShareRange.KnowLink:
        return MylistShareRange.KNOW_LINK;
      case GraphQLMylistShareRange.Private:
        return MylistShareRange.PRIVATE;
    }
  });

export const resolveUser = ({ dataSource: ds }: { dataSource: DataSource }) =>
  ({
    id: ({ id }): string => buildGqlId("Video", id),
    likes: resolveUserLikes({ dataSource: ds }),

    mylist: async ({ id: userId }, { id: gqlMylistId }, { user: authuser }) => {
      const mylist = await ds.getRepository(Mylist).findOne({ where: { id: parseGqlID("Mylist", gqlMylistId) } });

      if (!mylist) return null;
      if (mylist.range === MylistShareRange.PRIVATE && authuser?.id !== userId) return null;

      return new MylistModel(mylist);
    },

    mylists: async ({ id: userId }, { input }, { user: authuser }) => {
      if (input.range.includes(GraphQLMylistShareRange.Private) && userId !== authuser?.id)
        throw new GraphQLError(
          `Cannot list "${GraphQLMylistShareRange.Private}" mylists for "${buildGqlId("Video", userId)}"`
        );
      if (input.range.includes(GraphQLMylistShareRange.KnowLink) && userId !== authuser?.id)
        throw new GraphQLError(
          `Cannot list "${GraphQLMylistShareRange.KnowLink}" mylists for "${buildGqlId("Video", userId)}"`
        );

      const nodes = await ds
        .getRepository(Mylist)
        .find({
          where: {
            holder: { id: userId },
            range: In(convertMylistShareRange(input.range)),
          },
          take: input.limit,
          skip: input.skip,
          order: {
            createdAt: input.order.createdAt || undefined,
            updatedAt: input.order.updatedAt || undefined,
          },
        })
        .then((ms) => ms.map((m) => new MylistModel(m)));

      return {
        nodes,
      };
    },

    isEditor: ({ role }) => role === UserRole.EDITOR || role === UserRole.ADMINISTRATOR,
    isAdministrator: ({ role }) => role === UserRole.ADMINISTRATOR,
  } satisfies Resolvers["User"]);
