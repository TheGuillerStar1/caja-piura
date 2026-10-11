-- Gamificación por cashback: los puntos se reemplazan por soles que vuelven a la cuenta del cliente.
-- DropForeignKey
ALTER TABLE `Punto` DROP FOREIGN KEY `Punto_clienteId_fkey`;

-- AlterTable
ALTER TABLE `Pago` DROP COLUMN `puntosGanados`,
    ADD COLUMN `cashback` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `Punto`;

-- CreateTable
CREATE TABLE `Cashback` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clienteId` INTEGER NOT NULL,
    `cuentaId` INTEGER NOT NULL,
    `pagoId` INTEGER NOT NULL,
    `motivo` VARCHAR(80) NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Cashback_clienteId_creadoEn_idx`(`clienteId`, `creadoEn`),
    INDEX `Cashback_cuentaId_idx`(`cuentaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cashback` ADD CONSTRAINT `Cashback_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

