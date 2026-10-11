-- Centro de mando: campañas segmentadas (solo se agrega una tabla; no toca datos existentes).
-- CreateTable
CREATE TABLE `Campana` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(80) NOT NULL,
    `accion` ENUM('AVISO', 'RECORDATORIO_CUOTA', 'CASHBACK_DOBLE') NOT NULL,
    `segmento` JSON NOT NULL,
    `diasSimulados` INTEGER NOT NULL DEFAULT 0,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
