import { CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { type Relation } from "typeorm";

import { NicovideoVideoSource } from "./nicovideo_video_sources.js";
import { VideoTag } from "./video_tags.js";
import { VideoThumbnail } from "./video_thumbnails.js";
import { VideoTitle } from "./video_titles.js";

@Entity("videos")
export class Video {
  @PrimaryColumn("varchar", { length: 26 })
  id!: string;

  @CreateDateColumn({ type: "timestamptz" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  readonly updatedAt!: Date;

  @OneToMany(() => VideoTag, (videoTag) => videoTag.video)
  videoTags!: Relation<VideoTag[]>;

  @OneToMany(() => VideoThumbnail, (thumbnail) => thumbnail.video)
  thumbnails!: Relation<VideoThumbnail[]>;

  @OneToMany(() => VideoTitle, (title) => title.video)
  titles!: Relation<VideoTitle[]>;

  @OneToMany(() => NicovideoVideoSource, (source) => source.video)
  nicovideoSources!: Relation<NicovideoVideoSource[]>;
}
