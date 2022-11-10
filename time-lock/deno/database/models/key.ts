import { DataTypes, Model } from "https://deno.land/x/denodb@v1.1.0/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import {
  addSeconds,
  addYears,
  differenceInSeconds,
  parseISO,
} from "https://cdn.skypack.dev/date-fns@2.29.3";
import { getTimestamp } from "../../lib/decentralized-time/mod.ts";

export type KeyType = {
  uuid: string;
  iv: string;
  encrypted_partial_data: string;
  admin_password_hash: string;
  recovery_password_hash: string;
  lock_duration_seconds: number;
  unlock_at: Date | null;
  delete_at: Date;
};

export async function createKeyFromHttpRequest(
  data: Partial<KeyType> & {
    admin_password?: string;
    recovery_password?: string;
  },
) {
  if (
    typeof data.admin_password !== "string" ||
    data.admin_password.length < 1
  ) {
    throw new Error("admin_password is required");
  }

  if (
    typeof data.recovery_password !== "string" ||
    data.recovery_password.length < 1
  ) {
    throw new Error("recovery_password is required");
  }

  if (typeof data.iv !== "string" || data.iv.length < 1) {
    throw new Error("iv is required");
  }

  if (
    typeof data.encrypted_partial_data !== "string" ||
    data.encrypted_partial_data.length < 1
  ) {
    throw new Error("encrypted_partial_data string is required");
  }

  if (
    typeof data.lock_duration_seconds !== "number" ||
    data.lock_duration_seconds < 0
  ) {
    throw new Error("lock_duration_seconds number is required");
  }

  const values: KeyType = {
    uuid: crypto.randomUUID(),
    admin_password_hash: await bcrypt.hash(data.admin_password),
    recovery_password_hash: await bcrypt.hash(data.recovery_password),
    iv: data.iv,
    encrypted_partial_data: data.encrypted_partial_data,
    lock_duration_seconds: data.lock_duration_seconds,
    unlock_at: null,
    delete_at: addYears(new Date((await getTimestamp()).timestamp * 1000), 1),
  };

  await Key.create(values);

  return {
    ...values,
    admin_password_hash: undefined,
    recovery_password_hash: undefined,
  };
}

export async function readKeyFromHttpRequest({
  uuid,
  admin_password,
}: {
  admin_password: string;
  uuid: string;
}) {
  const key = await Key.where({
    uuid,
  }).first();

  if (!key) {
    throw new Error("key not found with the matching uuid");
  }

  const match = await bcrypt.compare(
    admin_password,
    key.admin_password_hash as string,
  );

  if (!match) {
    throw new Error("admin password did not match");
  }

  key.delete_at = addYears(
    new Date((await getTimestamp()).timestamp * 1000),
    1,
  );

  await key.update();

  return {
    ...key,
    admin_password_hash: undefined,
    recovery_password_hash: undefined,
    unlock_at: key.unlock_at ? parseISO(key.unlock_at).toISOString() : null,
  };
}

export async function deleteKeyFromHttpRequest({
  uuid,
  admin_password,
}: {
  admin_password: string;
  uuid: string;
}) {
  const key = await Key.where({
    uuid,
  }).first();

  if (!key) {
    throw new Error("key not found with the matching uuid");
  }

  const match = await bcrypt.compare(
    admin_password,
    key.admin_password_hash as string,
  );

  if (!match) {
    throw new Error("admin password did not match");
  }

  await key.delete();

  return {
    ...key,
    admin_password_hash: undefined,
    recovery_password_hash: undefined,
    unlock_at: key.unlock_at ? parseISO(key.unlock_at).toISOString() : null,
    delete_at: parseISO(key.delete_at).toISOString(),
  };
}

export async function getStatusOfKeyFromHttpRequest({
  uuid,
}: {
  uuid: string;
}) {
  const key = await Key.where({
    uuid,
  }).first();

  if (!key) {
    throw new Error("key not found with the matching uuid");
  }

  key.delete_at = addYears(
    new Date((await getTimestamp()).timestamp * 1000),
    1,
  );

  await key.update();

  return {
    unlock_at: key.unlock_at ? parseISO(key.unlock_at).toISOString() : null,
    delete_at: key.delete_at,
  };
}

export async function unlockKeyFromHttpRequest({
  uuid,
  recovery_password,
}: {
  recovery_password: string;
  uuid: string;
}) {
  const key = await Key.where({
    uuid,
  }).first();

  if (!key) {
    throw new Error("key not found with the matching uuid");
  }

  const match = await bcrypt.compare(
    recovery_password,
    key.recovery_password_hash as string,
  );

  if (!match) {
    throw new Error("password did not match");
  }

  key.delete_at = addYears(
    new Date((await getTimestamp()).timestamp * 1000),
    1,
  );

  let status: string;

  const currentDateTime = new Date((await getTimestamp()).timestamp * 1000);

  if (!key.unlock_at) {
    key.unlock_at = addSeconds(currentDateTime, key.lock_duration_seconds);
    status = "STARTED";
  } else if (
    differenceInSeconds(currentDateTime, parseISO(key.unlock_at)) > 1
  ) {
    status = "UNLOCKED";
  } else {
    status = "PENDING";
  }

  await key.update();

  const refetchedKey = await Key.where({
    uuid,
  }).first();

  if (!refetchedKey) {
    throw new Error("key not found with the matching uuid");
  }

  return {
    status,
    key:
      status === "UNLOCKED"
        ? {
            ...refetchedKey,
            admin_password_hash: undefined,
            recovery_password_hash: undefined,
            unlock_at: parseISO(refetchedKey.unlock_at).toISOString(),
            delete_at: parseISO(refetchedKey.delete_at).toISOString(),
          }
        : {
            unlock_at: parseISO(refetchedKey.unlock_at).toISOString(),
          },
  };
}

export class Key extends Model {
  static table = "keys";
  static timestamps = false;

  static fields = {
    uuid: {
      type: DataTypes.UUID,
      primaryKey: true,
      unique: true,
      allowNull: false,
    },

    encrypted_partial_data: {
      type: DataTypes.STRING,
      length: 10000,
      allowNull: false,
    },

    iv: {
      type: DataTypes.STRING,
      length: 300,
      allowNull: false,
    },

    admin_password_hash: {
      type: DataTypes.STRING,
      length: 1000,
      allowNull: false,
    },

    recovery_password_hash: {
      type: DataTypes.STRING,
      length: 1000,
      allowNull: false,
    },

    lock_duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    unlock_at: {
      type: DataTypes.TIMESTAMP,
      allowNull: true,
    },

    delete_at: {
      type: DataTypes.TIMESTAMP,
      allowNull: false,
    },
  };
}
