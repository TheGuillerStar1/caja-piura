-- CreateTable
CREATE TABLE `Cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dni` VARCHAR(8) NOT NULL,
    `nombre` VARCHAR(60) NOT NULL,
    `apellido` VARCHAR(60) NOT NULL,
    `edad` INTEGER NOT NULL,
    `ocupacion` ENUM('COMERCIANTE', 'AGRICULTOR', 'TRANSPORTISTA', 'OTRO') NOT NULL,
    `zona` ENUM('RURAL', 'URBANA') NOT NULL,
    `distrito` VARCHAR(60) NOT NULL,
    `opsPresencialesMes` INTEGER NOT NULL,
    `opsDigitalesMes` INTEGER NOT NULL,
    `gamaDispositivo` ENUM('BAJA', 'MEDIA', 'ALTA') NOT NULL,
    `diaPagoHabitual` INTEGER NOT NULL,
    `claveDemo` VARCHAR(6) NOT NULL,
    `vistaPreferida` ENUM('ASISTIDA', 'ESTANDAR') NULL,
    `primerIngreso` BOOLEAN NOT NULL DEFAULT true,
    `fechaSimulada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pagosSinAyuda` INTEGER NOT NULL DEFAULT 0,
    `esDemo` BOOLEAN NOT NULL DEFAULT false,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Cliente_dni_key`(`dni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cuenta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clienteId` INTEGER NOT NULL,
    `numero` VARCHAR(20) NOT NULL,
    `tipo` VARCHAR(30) NOT NULL,
    `saldo` DECIMAL(12, 2) NOT NULL,

    UNIQUE INDEX `Cuenta_numero_key`(`numero`),
    INDEX `Cuenta_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cuota` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clienteId` INTEGER NOT NULL,
    `credito` VARCHAR(20) NOT NULL,
    `numero` INTEGER NOT NULL,
    `totalCuotas` INTEGER NOT NULL,
    `monto` DECIMAL(12, 2) NOT NULL,
    `vencimiento` DATETIME(3) NOT NULL,
    `estado` ENUM('PENDIENTE', 'PAGADA') NOT NULL DEFAULT 'PENDIENTE',

    INDEX `Cuota_clienteId_estado_vencimiento_idx`(`clienteId`, `estado`, `vencimiento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Servicio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresa` VARCHAR(60) NOT NULL,
    `rubro` ENUM('LUZ', 'AGUA', 'TELEFONIA', 'INTERNET') NOT NULL,
    `formatoCodigo` VARCHAR(60) NOT NULL,
    `ayudaCodigo` VARCHAR(160) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Recibo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(30) NOT NULL,
    `servicioId` INTEGER NOT NULL,
    `titular` VARCHAR(120) NOT NULL,
    `monto` DECIMAL(12, 2) NOT NULL,
    `vencimiento` DATETIME(3) NOT NULL,
    `pagado` BOOLEAN NOT NULL DEFAULT false,
    `imagenKey` VARCHAR(200) NULL,

    INDEX `Recibo_codigo_idx`(`codigo`),
    UNIQUE INDEX `Recibo_servicioId_codigo_vencimiento_key`(`servicioId`, `codigo`, `vencimiento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Frecuente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clienteId` INTEGER NOT NULL,
    `alias` VARCHAR(40) NOT NULL,
    `servicioId` INTEGER NOT NULL,
    `codigo` VARCHAR(30) NOT NULL,
    `esPropio` BOOLEAN NOT NULL DEFAULT true,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Frecuente_clienteId_servicioId_codigo_key`(`clienteId`, `servicioId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pago` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idempotencyKey` VARCHAR(64) NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `cuentaId` INTEGER NOT NULL,
    `tipo` ENUM('CUOTA', 'FRECUENTE', 'RECIBO') NOT NULL,
    `referenciaId` INTEGER NOT NULL,
    `descripcion` VARCHAR(120) NOT NULL,
    `monto` DECIMAL(12, 2) NOT NULL,
    `estado` ENUM('EXITOSO', 'FALLIDO') NOT NULL,
    `conAyuda` BOOLEAN NOT NULL DEFAULT false,
    `puntosGanados` INTEGER NOT NULL DEFAULT 0,
    `operacion` VARCHAR(20) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Pago_idempotencyKey_key`(`idempotencyKey`),
    INDEX `Pago_clienteId_creadoEn_idx`(`clienteId`, `creadoEn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Punto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clienteId` INTEGER NOT NULL,
    `motivo` VARCHAR(80) NOT NULL,
    `puntos` INTEGER NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Punto_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clienteId` INTEGER NULL,
    `sesionId` VARCHAR(40) NOT NULL,
    `pantalla` VARCHAR(40) NOT NULL,
    `accion` VARCHAR(40) NOT NULL,
    `flujo` VARCHAR(20) NULL,
    `msDesdeInicio` INTEGER NULL,
    `ayudaUsada` BOOLEAN NOT NULL DEFAULT false,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Evento_pantalla_accion_idx`(`pantalla`, `accion`),
    INDEX `Evento_sesionId_idx`(`sesionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cuenta` ADD CONSTRAINT `Cuenta_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cuota` ADD CONSTRAINT `Cuota_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recibo` ADD CONSTRAINT `Recibo_servicioId_fkey` FOREIGN KEY (`servicioId`) REFERENCES `Servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Frecuente` ADD CONSTRAINT `Frecuente_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Frecuente` ADD CONSTRAINT `Frecuente_servicioId_fkey` FOREIGN KEY (`servicioId`) REFERENCES `Servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pago` ADD CONSTRAINT `Pago_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pago` ADD CONSTRAINT `Pago_cuentaId_fkey` FOREIGN KEY (`cuentaId`) REFERENCES `Cuenta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Punto` ADD CONSTRAINT `Punto_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evento` ADD CONSTRAINT `Evento_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
