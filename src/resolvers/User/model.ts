import { UserRole } from "../../db/entities/users.js";

export class UserModel {
  constructor(
    private readonly entity: {
      id: string;
      name: string;
      displayName: string;
      icon: string | null;
      role: UserRole;
    }
  ) {}

  get id() {
    return this.entity.id;
  }

  get name() {
    return this.entity.name;
  }

  get displayName() {
    return this.entity.displayName;
  }

  get icon() {
    return this.entity.icon;
  }

  get role() {
    return this.entity.role;
  }
}
