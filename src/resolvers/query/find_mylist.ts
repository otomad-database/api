import { DataSource } from "typeorm";

import { Mylist, MylistShareRange as MylistEntityShareRange } from "../../db/entities/mylists.js";
import { MylistModel } from "../../graphql/models.js";
import { QueryResolvers } from "../../graphql/resolvers.js";
import { ObjectType, removeIDPrefix } from "../../utils/id.js";

export const MYLIST_NOT_FOUND_OR_PRIVATE_ERROR = "Mylist Not Found or Private";
export const MYLIST_NOT_HOLDED_BY_YOU = "This mylist is not holded by you";

export const findMylist =
  ({ dataSource }: { dataSource: DataSource }): QueryResolvers["findMylist"] =>
  async (_parent, { id }, { user }) => {
    const mylist = await dataSource.getRepository(Mylist).findOne({
      where: { id: removeIDPrefix(ObjectType.Mylist, id) },
      relations: {
        holder: true,
      },
    });

    console.dir(user);

    if (!mylist) return null;
    if (mylist.range === MylistEntityShareRange.PRIVATE && mylist.holder.id !== user?.id) return null;

    return new MylistModel(mylist);
  };
