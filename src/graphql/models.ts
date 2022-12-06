import { Mylist } from "../db/entities/mylists.js";
import { Tag } from "../db/entities/tags.js";
import { User } from "../db/entities/users.js";
import { Video } from "../db/entities/videos.js";

export class VideoModel {
  public id;
  public createdAt;

  constructor(video: Video) {
    this.id = video.id;
    this.createdAt = video.createdAt;
  }
}

export class TagModel {
  public id;
  public meaningless;

  constructor(tag: Tag) {
    this.id = tag.id;
    this.meaningless = tag.meaningless;
  }
}

export class UserModel {
  public id;
  public name;
  public displayName;
  public icon;

  constructor(private readonly user: User) {
    this.id = user.id;
    this.name = user.name;
    this.displayName = user.displayName;
    this.icon = user.icon;
  }
}

export class MylistModel {
  public id;
  public range;

  constructor(private readonly mylist: Mylist) {
    this.id = mylist.id;
    this.range = mylist.range;
  }
}

export class MylistRegistrationModel {
  public id;
  public createdAt;
  public updatedAt;
  public video: VideoModel;
  public mylist: MylistModel;

  constructor(
    private readonly reg: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      video: Video;
      mylist: Mylist;
    }
  ) {
    this.id = reg.id;
    this.createdAt = reg.createdAt;
    this.updatedAt = reg.updatedAt;
    this.video = new VideoModel(reg.video);
    this.mylist = new MylistModel(reg.mylist);
  }
}