CREATE TABLE
  `keys` (
    `uuid` char(36) NOT NULL,
    `encrypted_partial_data` varchar(10000) NOT NULL,
    `iv` varchar(300) NOT NULL,
    `admin_password_hash` varchar(1000) NOT NULL,
    `recovery_password_hash` varchar(1000) NOT NULL,
    `lock_duration_seconds` int NOT NULL,
    `unlock_at` timestamp NULL,
    `delete_at` timestamp NOT NULL,
    PRIMARY KEY (`uuid`),
    UNIQUE KEY `uuid` (`uuid`)
  ) ENGINE InnoDB,
  CHARSET utf8mb4,
  COLLATE utf8mb4_0900_ai_ci;