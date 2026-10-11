-- CreateTable
CREATE TABLE `Transferencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idempotencyKey` VARCHAR(64) NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `cuentaId` INTEGER NOT NULL,
    `telefono` VARCHAR(9) NOT NULL,
    `nombreContacto` VARCHAR(60) NOT NULL,
    `titular` VARCHAR(120) NOT NULL,
    `billetera` VARCHAR(10) NOT NULL,
    `monto` DECIMAL(12, 2) NOT NULL,
    `operacion` VARCHAR(20) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Transferencia_idempotencyKey_key`(`idempotencyKey`),
    INDEX `Transferencia_clienteId_creadoEn_idx`(`clienteId`, `creadoEn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Transferencia` ADD CONSTRAINT `Transferencia_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transferencia` ADD CONSTRAINT `Transferencia_cuentaId_fkey` FOREIGN KEY (`cuentaId`) REFERENCES `Cuenta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

