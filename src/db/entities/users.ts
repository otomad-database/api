import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { type Relation } from "typeorm";

import { Session } from "./sessions.js";

export enum UserRole {
  NORMAL = "NORMAL",
  EDITOR = "EDITOR",
  ADMINISTRATOR = "ADMINISTRATOR",
}

@Entity("users")
export class User {
  @PrimaryColumn("varchar", { length: 26 })
  id!: string;

  @Column("citext", { nullable: false, unique: true })
  name!: string;

  @Column("text", { nullable: false })
  displayName!: string;

  @Column("text", { nullable: true })
  icon!: string | null;

  @Column("text", { nullable: false })
  email!: string;

  @Column("boolean", { default: false, nullable: false })
  emailConfirmed!: boolean;

  @Column("text", { nullable: false })
  password!: string;

  @CreateDateColumn({ type: "timestamptz" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  readonly updatedAt!: Date;

  @OneToMany((_type) => Session, (session) => session.user)
  sessions!: Relation<Session[]>;

  @Column("enum", { enum: UserRole, default: UserRole.NORMAL })
  role!: UserRole;
}
