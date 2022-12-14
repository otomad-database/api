import { Mylist } from "../../db/entities/mylists.js";

export class MylistModel {
  public id;
  public range;
  public title;
  public isLikeList: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  constructor({ id, range, title, createdAt, updatedAt, isLikeList }: Mylist) {
    this.id = id;
    this.title = title;
    this.range = range;
    this.isLikeList = isLikeList;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
