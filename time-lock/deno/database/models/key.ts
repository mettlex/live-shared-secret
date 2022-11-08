import { DataTypes, Model } from "https://deno.land/x/denodb@v1.1.0/mod.ts";

export type KeyType = {
  uuid: string;
  iv: string;
  encrypted_partial_data: string;
  admin_password_hash: string;
  recovery_password_hash: string;
  lock_duration_seconds: number;
  unlock_at: Date;
  delete_at: Date;
};

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

  async create(
    _createRequestData: Partial<KeyType> & {
      admin_password: string;
      recovery_password: string;
    },
  ) {
    // TODO: save in db
  }
}
