CREATE TABLE
  keys (
    uuid char(36) not null,
    encrypted_partial_data varchar(10000) not null,
    iv varchar(300) not null,
    admin_password_hash varchar(1000) not null,
    recovery_password_hash varchar(1000) not null,
    lock_duration_seconds integer not null,
    unlock_at timestamp,
    delete_at timestamp not null,
    constraint uuid primary key (uuid)
  );