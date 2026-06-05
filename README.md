# AduanaChain

**AduanaChain** es una DApp para gestión y seguimiento aduanal basada en blockchain.
El proyecto permite registrar mercancías, controlar su avance dentro de un flujo aduanal y consultar un historial verificable de movimientos mediante la red de pruebas **Sepolia**.

## Problema que resuelve

En un proceso aduanal participan distintos actores, como operadores logísticos, autoridades, agentes aduanales y clientes. En sistemas tradicionales puede ser difícil comprobar con claridad:

* quién registró una mercancía;
* cuándo fue revisada;
* cuándo fue aprobada;
* qué wallet fue autorizada;
* quién confirmó la entrega;
* si existe evidencia verificable del movimiento.

AduanaChain propone una solución de trazabilidad donde cada operación importante queda registrada en blockchain, permitiendo consultar evidencia verificable mediante comprobantes en Sepolia.

## Objetivo del proyecto

Desarrollar una DApp funcional que permita dar seguimiento a mercancías durante un proceso aduanal, utilizando contratos inteligentes para registrar estados, roles, autorizaciones e historial de movimientos.

## Flujo principal

El flujo operativo de AduanaChain es:

```text
Operador registra mercancía
        ↓
Autoridad inicia revisión
        ↓
Autoridad aprueba la mercancía
        ↓
Administrador autoriza al Agente
        ↓
Agente confirma la entrega final
        ↓
Cliente Autorizado consulta el historial
```

## Tecnologías utilizadas

* Angular
* TypeScript
* Solidity
* ethers.js
* MetaMask
* Sepolia Testnet
* Firebase Hosting
* Git / GitHub

## Funcionalidades principales

* Conexión con MetaMask.
* Identificación automática del rol de la wallet conectada.
* Control de acceso por roles.
* Registro de usuarios.
* Registro de mercancías.
* Cambio de estados de mercancía.
* Autorización de wallets por mercancía.
* Confirmación de entrega final.
* Consulta de mercancías visibles según el rol.
* Historial verificable de movimientos.
* Enlaces directos a comprobantes en Sepolia.
* Centro de Control Aduanal con pendientes según el rol.
* Modales visuales para transacciones blockchain.
* Tarjeta de última operación verificada.

## Roles del sistema

| Rol                | Función                                                           |
| ------------------ | ----------------------------------------------------------------- |
| Administrador      | Registra usuarios, asigna roles y autoriza wallets por mercancía. |
| Operador           | Registra nuevas mercancías dentro del sistema.                    |
| Autoridad          | Revisa y aprueba mercancías.                                      |
| Agente             | Confirma la entrega final de mercancías aprobadas y autorizadas.  |
| Cliente Autorizado | Consulta el seguimiento e historial de sus mercancías.            |

## Estados de una mercancía

Las mercancías siguen el siguiente flujo de estados:

```text
Registrada → En revisión → Aprobada → Entregada
```

Cada cambio de estado queda registrado en blockchain y puede consultarse posteriormente desde el historial verificable.

## Blockchain

AduanaChain utiliza la red de pruebas **Sepolia**.
La DApp no maneja pagos, no retiene ETH y no utiliza tokens. El SepoliaETH únicamente se usa para pagar el gas de las transacciones.

No se utilizan:

* tokens ERC-20;
* NFTs;
* monedas propias;
* depósitos de ETH;
* pagos dentro de la DApp.

Cada mercancía se maneja como un registro dentro del contrato inteligente.

## Contrato inteligente

Contrato desplegado en Sepolia:

```text
0xb80aa4F28e5cDaECff5Fc4EEFf5FbD192cBc2aED
```

## URL pública

La DApp está publicada en Firebase Hosting:

```text
https://aduanachain.web.app
```

## Instalación local

Clonar el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO>
```

Entrar a la carpeta del proyecto:

```bash
cd ADUANACHAIN-DAPP
```

Instalar dependencias:

```bash
npm install
```

Ejecutar en modo desarrollo:

```bash
npm start
```

Abrir en el navegador:

```text
http://localhost:4200
```

## Compilación

Para generar la versión de producción:

```bash
npm run build
```

La salida se genera en:

```text
dist/aduanachain-dapp/browser
```

## Despliegue en Firebase Hosting

Para publicar la DApp:

```bash
firebase deploy --only hosting
```

## Alcance del proyecto

AduanaChain es un prototipo académico enfocado en trazabilidad y verificación de movimientos aduanales mediante blockchain.
No busca reemplazar un sistema aduanal real completo, ya que no gestiona impuestos, pedimentos oficiales, validaciones gubernamentales ni documentación fiscal.

Su propósito principal es demostrar cómo blockchain puede utilizarse para registrar y auditar eventos importantes dentro del seguimiento de mercancías.

## Autor

Proyecto desarrollado como DApp académica para gestión y seguimiento aduanal mediante blockchain.
