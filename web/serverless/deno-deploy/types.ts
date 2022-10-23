export type EncryptedShare = {
  public_key: string;
  encrypted_share_text: string;
};

export type Room = {
  uuid: string;
  min_share_count: number;
  encrypted_shares: EncryptedShare[];
};

export type SetMinShareCountRequestBody = {
  room: Partial<Room>;
};

export type AddEncryptedShareRequestBody = {
  room: Partial<{ uuid: Room["uuid"] }>;
  encrypted_share: Partial<EncryptedShare>;
};
