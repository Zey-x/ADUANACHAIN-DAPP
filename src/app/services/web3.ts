import { Injectable, signal } from '@angular/core';
import { ethers } from 'ethers';

export interface Mercancia {
  id: string;
  tipoMercancia: string;
  origen: string;
  destinoAduanal: string;
  estado: string;
  clienteAutorizado: string;
  registradoPor: string;
  fechaRegistro: string;
}

export interface Movimiento {
  estadoAnterior: string;
  estadoNuevo: string;
  realizadoPor: string;
  fecha: string;
}

export interface ComprobanteMovimiento {
  tipo: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  realizadoPor: string;
  hash: string;
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class Web3Service {
  public account = signal<string | null>(null);
  public balance = signal<string | null>(null);
  public estadoConexion = signal<string>('No conectado');
  public ultimaTransaccionHash = signal<string | null>(null);

  // MetaMask: se utiliza para operaciones que requieren firma.
  private walletProvider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private writeContract: ethers.Contract | null = null;

  // RPC de lectura: se utiliza para consultas e historial.
  private readProvider: ethers.JsonRpcProvider | null = null;
  private readContract: ethers.Contract | null = null;

  private readonly contractAddress =
    '0xb80aa4F28e5cDaECff5Fc4EEFf5FbD192cBc2aED';

  private readonly sepoliaChainId = 11155111;

  private readonly rpcSepolia =
    'https://ethereum-sepolia-rpc.publicnode.com';

  /**
   * Para las pruebas actuales buscamos eventos recientes.
   * Tu contrato fue desplegado recientemente y los movimientos
   * actuales están dentro de este rango.
   *
   * Más adelante podremos sustituir este valor por el bloque
   * exacto de despliegue del contrato.
   */
  private readonly bloquesRecientesParaEventos = 1000;

  /**
   * Cada consulta de eventos se hará en rangos pequeños para
   * evitar errores del RPC al buscar demasiados logs a la vez.
   */
  private readonly tamanoRangoEventos = 200;

  private readonly abi = [
    'function administrador() view returns (address)',
    'function totalMercancias() view returns (uint256)',
    'function roles(address) view returns (uint8)',

    'function registrarUsuario(address _usuario, uint8 _rol)',
    'function registrarMercancia(string _tipoMercancia, string _origen, string _destinoAduanal, address _clienteAutorizado)',
    'function autorizarUsuarioMercancia(uint256 _id, address _usuario)',
    'function cambiarEstado(uint256 _id, uint8 _nuevoEstado)',

    'function consultarMercancia(uint256 _id) view returns (uint256 id, string tipoMercancia, string origen, string destinoAduanal, uint8 estado, address clienteAutorizado, address registradoPor, uint256 fechaRegistro)',
    'function consultarHistorial(uint256 _id) view returns (tuple(uint8 estadoAnterior, uint8 estadoNuevo, address realizadoPor, uint256 fecha)[])',
    'function estaAutorizado(uint256 _id, address _usuario) view returns (bool)',

    'event UsuarioRegistrado(address indexed usuario, uint8 rol, address indexed registradoPor)',
    'event MercanciaRegistrada(uint256 indexed idMercancia, string tipoMercancia, address indexed clienteAutorizado, address indexed registradoPor)',
    'event UsuarioAutorizadoEnMercancia(uint256 indexed idMercancia, address indexed usuario, uint8 rol, address indexed autorizadoPor)',
    'event EstadoActualizado(uint256 indexed idMercancia, uint8 estadoAnterior, uint8 estadoNuevo, address indexed realizadoPor)',
  ];

  // =========================================================
  // Conexión Web3
  // =========================================================

  async connectWallet(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask no está instalado.');
    }

    try {
      this.walletProvider = new ethers.BrowserProvider(window.ethereum);

      const accounts = await this.walletProvider.send(
        'eth_requestAccounts',
        []
      );

      if (!accounts || accounts.length === 0) {
        throw new Error('No se seleccionó ninguna cuenta.');
      }

      const network = await this.walletProvider.getNetwork();

      if (Number(network.chainId) !== this.sepoliaChainId) {
        throw new Error('Selecciona la red Sepolia en MetaMask.');
      }

      const cuenta = accounts[0];

      this.account.set(cuenta);
      this.signer = await this.walletProvider.getSigner();

      const balanceWei = await this.walletProvider.getBalance(cuenta);
      this.balance.set(ethers.formatEther(balanceWei));

      this.writeContract = new ethers.Contract(
        this.contractAddress,
        this.abi,
        this.signer
      );

      this.readProvider = new ethers.JsonRpcProvider(
        this.rpcSepolia,
        this.sepoliaChainId
      );

      this.readContract = new ethers.Contract(
        this.contractAddress,
        this.abi,
        this.readProvider
      );

      this.estadoConexion.set('Conectado a MetaMask');
      this.ultimaTransaccionHash.set(null);

      console.log('Cuenta conectada:', cuenta);
      console.log('Contrato v1.2:', this.contractAddress);
    } catch (error) {
      console.error('Error al conectar MetaMask:', error);
      this.estadoConexion.set('Error al conectar');
      throw error;
    }
  }

  private verificarLectura(): void {
    if (!this.readContract || !this.readProvider) {
      throw new Error('Primero conecta MetaMask.');
    }
  }

  private verificarEscritura(): void {
    if (!this.writeContract) {
      throw new Error('Primero conecta MetaMask.');
    }
  }

  private obtenerCuentaConectada(): string {
    const cuenta = this.account();

    if (!cuenta) {
      throw new Error('Primero conecta MetaMask.');
    }

    return cuenta;
  }

  // =========================================================
  // Consultas generales del contrato
  // =========================================================

  async obtenerAdministrador(): Promise<string> {
    this.verificarLectura();

    return await this.readContract!['administrador']();
  }

  async obtenerTotalMercancias(): Promise<string> {
    this.verificarLectura();

    const total = await this.readContract!['totalMercancias']();
    return total.toString();
  }

  async obtenerRol(wallet: string): Promise<string> {
    this.verificarLectura();

    const rol = await this.readContract!['roles'](wallet.trim());
    return this.nombreRol(Number(rol));
  }

  // =========================================================
  // Operaciones de escritura
  // =========================================================

  async registrarUsuario(wallet: string, rol: number): Promise<string> {
    this.verificarEscritura();

    const tx = await this.writeContract!['registrarUsuario'](
      wallet.trim(),
      rol
    );

    await tx.wait();

    this.ultimaTransaccionHash.set(tx.hash);
    return tx.hash;
  }

  async registrarMercancia(
    tipoMercancia: string,
    origen: string,
    destinoAduanal: string,
    clienteAutorizado: string
  ): Promise<string> {
    this.verificarEscritura();

    const tx = await this.writeContract!['registrarMercancia'](
      tipoMercancia.trim(),
      origen.trim(),
      destinoAduanal.trim(),
      clienteAutorizado.trim()
    );

    await tx.wait();

    this.ultimaTransaccionHash.set(tx.hash);
    return tx.hash;
  }

  async autorizarUsuarioMercancia(
    idMercancia: number,
    wallet: string
  ): Promise<string> {
    this.verificarEscritura();

    const tx = await this.writeContract!['autorizarUsuarioMercancia'](
      idMercancia,
      wallet.trim()
    );

    await tx.wait();

    this.ultimaTransaccionHash.set(tx.hash);
    return tx.hash;
  }

  async cambiarEstado(id: number, nuevoEstado: number): Promise<string> {
    this.verificarEscritura();

    const tx = await this.writeContract!['cambiarEstado'](
      id,
      nuevoEstado
    );

    await tx.wait();

    this.ultimaTransaccionHash.set(tx.hash);
    return tx.hash;
  }

  // =========================================================
  // Consulta de mercancías
  // =========================================================

  async estaAutorizado(id: number, wallet: string): Promise<boolean> {
    this.verificarLectura();

    return await this.readContract!['estaAutorizado'](
      id,
      wallet.trim()
    );
  }

  async consultarMercancia(id: number): Promise<Mercancia> {
    this.verificarLectura();

    const cuenta = this.obtenerCuentaConectada();

    /*
      En el contrato, la consulta valida msg.sender.
      Por eso enviamos la wallet conectada como "from" en la lectura.
    */
    const resultado = await this.readContract!['consultarMercancia'](
      id,
      { from: cuenta }
    );

    return {
      id: resultado[0].toString(),
      tipoMercancia: resultado[1],
      origen: resultado[2],
      destinoAduanal: resultado[3],
      estado: this.nombreEstado(Number(resultado[4])),
      clienteAutorizado: resultado[5],
      registradoPor: resultado[6],
      fechaRegistro: new Date(
        Number(resultado[7]) * 1000
      ).toLocaleString(),
    };
  }

  async consultarHistorial(id: number): Promise<Movimiento[]> {
    this.verificarLectura();

    const cuenta = this.obtenerCuentaConectada();

    const resultado = await this.readContract!['consultarHistorial'](
      id,
      { from: cuenta }
    );

    return resultado.map((mov: any) => ({
      estadoAnterior: this.nombreEstado(Number(mov.estadoAnterior)),
      estadoNuevo: this.nombreEstado(Number(mov.estadoNuevo)),
      realizadoPor: mov.realizadoPor,
      fecha: new Date(Number(mov.fecha) * 1000).toLocaleString(),
    }));
  }

  // =========================================================
  // Comprobantes blockchain del historial
  // =========================================================

  async consultarComprobantesHistorial(
    idMercancia: number
  ): Promise<ComprobanteMovimiento[]> {
    this.verificarLectura();

    const ultimoBloque = await this.readProvider!.getBlockNumber();

    const desdeBloque = Math.max(
      0,
      ultimoBloque - this.bloquesRecientesParaEventos
    );

    console.log(
      'Buscando comprobantes del lote',
      idMercancia,
      'desde bloque',
      desdeBloque,
      'hasta bloque',
      ultimoBloque
    );

    const filtroRegistro =
      this.readContract!.filters['MercanciaRegistrada'](idMercancia);

    const filtroEstado =
      this.readContract!.filters['EstadoActualizado'](idMercancia);

    const eventosRegistro = await this.buscarEventosPorRangos(
      filtroRegistro,
      desdeBloque,
      ultimoBloque
    );

    const eventosEstado = await this.buscarEventosPorRangos(
      filtroEstado,
      desdeBloque,
      ultimoBloque
    );

    const eventosCombinados = [
      ...eventosRegistro.map((evento: any) => ({
        clase: 'registro',
        evento,
      })),
      ...eventosEstado.map((evento: any) => ({
        clase: 'estado',
        evento,
      })),
    ];

    eventosCombinados.sort((a: any, b: any) => {
      const diferenciaBloque =
        Number(a.evento.blockNumber) - Number(b.evento.blockNumber);

      if (diferenciaBloque !== 0) {
        return diferenciaBloque;
      }

      return Number(a.evento.index ?? 0) - Number(b.evento.index ?? 0);
    });

    const comprobantes: ComprobanteMovimiento[] = [];

    for (const registro of eventosCombinados) {
      const evento = registro.evento;

      if (registro.clase === 'registro') {
        comprobantes.push({
          tipo: 'Mercancía registrada',
          estadoAnterior: 'Registrada',
          estadoNuevo: 'Registrada',
          realizadoPor: evento.args.registradoPor,
          hash: evento.transactionHash,
          url: this.obtenerUrlTransaccion(evento.transactionHash),
        });
      } else {
        comprobantes.push({
          tipo: 'Cambio de estado',
          estadoAnterior: this.nombreEstado(
            Number(evento.args.estadoAnterior)
          ),
          estadoNuevo: this.nombreEstado(
            Number(evento.args.estadoNuevo)
          ),
          realizadoPor: evento.args.realizadoPor,
          hash: evento.transactionHash,
          url: this.obtenerUrlTransaccion(evento.transactionHash),
        });
      }
    }

    console.log('Comprobantes encontrados:', comprobantes);

    return comprobantes;
  }

  /**
   * Consulta eventos en grupos pequeños para evitar que el RPC rechace
   * solicitudes demasiado grandes de logs históricos.
   */
  private async buscarEventosPorRangos(
    filtro: any,
    desdeBloque: number,
    hastaBloque: number
  ): Promise<any[]> {
    const eventos: any[] = [];

    for (
      let inicio = desdeBloque;
      inicio <= hastaBloque;
      inicio += this.tamanoRangoEventos
    ) {
      const fin = Math.min(
        inicio + this.tamanoRangoEventos - 1,
        hastaBloque
      );

      console.log('Consultando eventos en rango:', inicio, '-', fin);

      const resultado = await this.readContract!.queryFilter(
        filtro,
        inicio,
        fin
      );

      eventos.push(...resultado);
    }

    return eventos;
  }

  // =========================================================
  // Utilidades
  // =========================================================

  obtenerUrlTransaccion(hash: string): string {
    return `https://sepolia.etherscan.io/tx/${hash}`;
  }

  nombreRol(rol: number): string {
    const roles = [
      'Ninguno',
      'Administrador',
      'Operador',
      'Autoridad',
      'Agente',
      'Cliente Autorizado',
    ];

    return roles[rol] || 'Desconocido';
  }

  nombreEstado(estado: number): string {
    const estados = [
      'Registrada',
      'En revisión',
      'Aprobada',
      'Entregada',
    ];

    return estados[estado] || 'Desconocido';
  }
}