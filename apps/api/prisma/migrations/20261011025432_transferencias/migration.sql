-- CreateTable
CREATE TABLE `Transferencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idempotencyKey` VARCHAR(64) NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `tipo` ENUM('PROPIAS', 'TERCEROS', 'INTERBANCARIA', 'CONTACTO') NOT NULL,
    `cuentaOrigenId` INTEGER NOT NULL,
    `cuentaDestinoId` INTEGER NULL,
    `destinoClienteId` INTEGER NULL,
    `destino` VARCHAR(30) NOT NULL,
    `nombreDestino` VARCHAR(80) NOT NULL,
    `monto` DECIMAL(12, 2) NOT NULL,
    `glosa` VARCHAR(100) NULL,
    `operacion` VARCHAR(20) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Transferencia_idempotencyKey_key`(`idempotencyKey`),
    INDEX `Transferencia_cuentaOrigenId_idx`(`cuentaOrigenId`),
    INDEX `Transferencia_cuentaDestinoId_idx`(`cuentaDestinoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Transferencia` ADD CONSTRAINT `Transferencia_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
