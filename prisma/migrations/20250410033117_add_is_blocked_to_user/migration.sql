-- AlterTable
ALTER TABLE `ewaste` ADD COLUMN `rejectionReason` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `isBlocked` BOOLEAN NOT NULL DEFAULT false;
