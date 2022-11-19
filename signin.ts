import { compare as compareBCrypt } from "bcrypt/mod.ts";
import { GraphQLError } from "graphql";
import { MongoClient } from "mongo/mod.ts";
import { getAccountsCollection } from "./collections.ts";
import { signAccessJWT, signRefreshJWT } from "./jwt.ts";
import { getUserById } from "./user.ts";

export class SigninPayload {
  protected accessToken;
  protected refreshToken;
  private userId;

  constructor({ accessToken, refreshToken, userId }: { accessToken: string; refreshToken: string; userId: string }) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.userId = userId;
  }

  user(_: unknown, ctx: { mongo: MongoClient }) {
    return getUserById(this.userId, ctx);
  }
}

export const signin = async (
  { name, password }: { name: string; password: string },
  context: { mongo: MongoClient },
) => {
  const accountsColl = await getAccountsCollection(context.mongo);
  const account = await accountsColl.findOne({ name: name });
  if (!account) {
    throw new GraphQLError("Not found user");
  }

  // TODO: email confirm check

  if (!await compareBCrypt(password, account.password)) {
    throw new GraphQLError("Not matched password");
  }

  const accessToken = await signAccessJWT({
    issuer: "otomadb.com",
    userId: account.user_id,
    expiresIn: 60 * 60,
  });
  const refreshToken = await signRefreshJWT({
    issuer: "otomadb.com",
    userId: account.user_id,
    expiresIn: 60 * 60,
  });

  return new SigninPayload({
    accessToken: accessToken,
    refreshToken: refreshToken,
    userId: account.user_id,
  });
};