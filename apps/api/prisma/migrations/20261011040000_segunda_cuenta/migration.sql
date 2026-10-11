-- Clientes de prueba con una sola cuenta: se les agrega un «Ahorro corriente» para poder cambiar de cuenta y transferir.
INSERT INTO `Cuenta` (`clienteId`, `numero`, `tipo`, `saldo`)
SELECT `clienteId`, CONCAT('0011040', LPAD(`clienteId`, 7, '0')), 'Ahorro corriente', 350.00
FROM `Cuenta`
GROUP BY `clienteId`
HAVING COUNT(*) = 1;
