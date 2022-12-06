import { GraphQLError } from "graphql";

import { QueryResolvers } from "~/codegen/resolvers.js";
import { dataSource } from "~/db/data-source.js";
import { User } from "~/db/entities/users.js";
import { UserModel } from "~/models/user.js";

export const getUser: QueryResolvers["user"] = async (_parent, { name }, _context, _info) => {
  const user = await dataSource.getRepository(User).findOne({ where: { name } });
  if (!user) throw new GraphQLError("Not Found");

  return new UserModel(user);
};