-- «Pagan solos» por tipo de operación: las transferencias (yapeos) guardan si se hicieron con ayuda.
-- Columna opcional: las transferencias anteriores quedan en NULL y no se cuentan. No toca datos existentes.
-- AlterTable
ALTER TABLE `Transferencia` ADD COLUMN `conAyuda` BOOLEAN NULL;
