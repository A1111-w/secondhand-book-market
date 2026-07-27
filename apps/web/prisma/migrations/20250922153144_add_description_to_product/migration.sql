/*
  Warnings:

  - You are about to drop the column `type` on the `product` table. All the data in the column will be lost.
  - Added the required column `category` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contact` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `images` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `product` DROP COLUMN `type`,
    ADD COLUMN `category` VARCHAR(191) NOT NULL,
    ADD COLUMN `contact` VARCHAR(191) NOT NULL,
    ADD COLUMN `description` VARCHAR(191) NULL DEFAULT '哎呀介绍忘记写了',
    ADD COLUMN `images` VARCHAR(191) NOT NULL;
