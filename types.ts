export type SymmetricKey = {
  algo: string;
  key: string;
};

export type AsymmetricKey = {
  algo: string;
  privateKey: string;
  publicKey: string;
};

export type EncryptedCipher = {
  algo: string;
  iv: string;
  text: string;
};

export type PrivateUser = {
  id: string;
  symmetricKey: SymmetricKey;
  passwordShare: string;
  encryptPasswordShare: ({
    symmetricKey,
    passwordShare,
  }: {
    symmetricKey: PrivateUser["symmetricKey"];
    passwordShare: PrivateUser["passwordShare"];
  }) => Promise<EncryptedCipher>;
};

export type PasswordShareInfo = {
  encryptedPasswordShare: EncryptedCipher;
  minimumShareCount: number;
};

export type PublicPeer = {
  id: string;
  nickname: string;
  publicKey: AsymmetricKey["publicKey"];
};

export type PublicUser = {
  id: string;
  nickname: string;
  peers: PublicPeer[];
  passwordShareInfo: PasswordShareInfo;
};
