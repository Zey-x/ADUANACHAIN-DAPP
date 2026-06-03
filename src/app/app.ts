import { ChangeDetectorRef, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Web3Service, ComprobanteMovimiento } from './services/web3';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  public web3 = inject(Web3Service);
  private cdr = inject(ChangeDetectorRef);

  protected readonly title = signal('AduanaChain');

  // =========================================================
  // CONTROL DE SESIÓN Y CARGA AUTOMÁTICA
  // =========================================================

  public iniciandoSesion = false;
  public sesionLista = false;

  // =========================================================
  // FORMULARIOS: ADMINISTRACIÓN DE USUARIOS
  // Roles:
  // 2 = Operador
  // 3 = Autoridad
  // 4 = Agente
  // 5 = Cliente Autorizado
  // =========================================================

  public walletUsuario = '';
  public rolUsuario = 2;

  // =========================================================
  // FORMULARIOS: AUTORIZACIÓN POR MERCANCÍA
  // =========================================================

  public idMercanciaAutorizar: number | null = null;
  public walletAutorizar = '';

  // =========================================================
  // FORMULARIOS: REGISTRO DE MERCANCÍA
  // =========================================================

  public descripcion = '';
  public origen = '';
  public destino = '';
  public clienteAutorizado = '';

  // =========================================================
  // FORMULARIOS: CONSULTA, ESTADO Y ENTREGA
  // =========================================================

  public idConsulta: number | null = null;
  public idEstado: number | null = null;
  public nuevoEstado = 1;
  public idEntrega: number | null = null;

  // =========================================================
  // RESULTADOS GENERALES
  // =========================================================

  public mensaje = '';
  public mercancia: any = null;
  public historial: ComprobanteMovimiento[] = [];

  public administrador = '';
  public totalMercancias = '';
  public rolConsultado = '';
  public rolActual = '';

  // =========================================================
  // MERCANCÍAS VISIBLES
  // =========================================================

  public mercanciasVisibles: any[] = [];
  public cargandoMercancias = false;
  public listaMercanciasCargada = false;

  // =========================================================
  // CONTROL DE CARGA DEL HISTORIAL
  // =========================================================

  public cargandoHistorial = false;

  // =========================================================
  // TOAST BLOCKCHAIN
  // =========================================================

  public toastVisible = false;
  public toastMensaje = '';
  public toastUrl = '';

  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // =========================================================
  // MODAL DE DESCONEXIÓN
  // =========================================================

  public modalDesconexionVisible = false;
  public estadoDesconexion: 'procesando' | 'completada' | 'error' = 'procesando';
  public mensajeDesconexion = '';

  // =========================================================
  // MODAL DE TRANSACCIONES BLOCKCHAIN
  // =========================================================

  public modalTransaccionVisible = false;
  public estadoTransaccion: 'esperando' | 'confirmada' | 'error' = 'esperando';
  public tituloTransaccion = '';
  public mensajeTransaccion = '';
  public referenciaTransaccion = '';
  public urlTransaccion = '';

  // =========================================================
  // ÚLTIMA OPERACIÓN VERIFICADA
  // =========================================================

  public ultimaOperacionVisible = false;
  public ultimaOperacionTitulo = '';
  public ultimaOperacionDetalle = '';
  public ultimaOperacionHash = '';
  public ultimaOperacionUrl = '';
  public ultimaOperacionFecha = '';

  // =========================================================
  // LIMPIEZA DEL COMPONENTE
  // =========================================================

  ngOnDestroy(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  // =========================================================
  // CONEXIÓN INICIAL DESDE LA LANDING
  // =========================================================

  async conectarWallet(): Promise<void> {
    try {
      this.iniciandoSesion = true;
      this.sesionLista = false;
      this.mensaje = 'Conectando con MetaMask...';
      this.actualizarVista();

      await this.web3.connectWallet();

      this.limpiarDatosDeSesion();

      this.mensaje = 'Identificando tu rol y permisos...';
      this.actualizarVista();

      await this.cargarDatosContrato(true);
    } catch (error: any) {
      console.error('Error al conectar wallet:', error);

      this.iniciandoSesion = false;
      this.sesionLista = false;

      if (error?.code === 4001) {
        this.mensaje = 'Conexión cancelada por el usuario.';
      } else {
        this.mensaje = 'No fue posible conectar la wallet con MetaMask.';
      }

      this.actualizarVista();
    }
  }

  // =========================================================
  // DESCONECTAR WALLET Y REGRESAR AL HUB
  // =========================================================

  async desconectarWallet(): Promise<void> {
    if (this.iniciandoSesion) {
      return;
    }

    try {
      const ethereum = (window as any).ethereum;

      if (!ethereum?.request) {
        this.mensaje = 'MetaMask no está disponible en este navegador.';
        this.actualizarVista();
        return;
      }

      this.modalDesconexionVisible = true;
      this.estadoDesconexion = 'procesando';
      this.mensajeDesconexion =
        'Cerrando tu acceso de forma segura. Tus registros blockchain permanecerán intactos.';
      this.iniciandoSesion = true;
      this.actualizarVista();

      await ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });

      this.estadoDesconexion = 'completada';
      this.mensajeDesconexion =
        'Tu wallet se desconectó correctamente. Redirigiéndote al hub de acceso...';
      this.actualizarVista();

      await this.esperar(1100);

      this.sesionLista = false;
      this.iniciandoSesion = false;
      this.modalDesconexionVisible = false;
      this.mensajeDesconexion = '';
      this.mensaje = '';

      this.limpiarDatosDeSesion();
      this.web3.desconectarSesionLocal();

      window.history.replaceState(null, '', window.location.pathname);

      this.actualizarVista();
    } catch (error: any) {
      console.error('Error al desconectar wallet:', error);

      this.iniciandoSesion = false;
      this.estadoDesconexion = 'error';

      if (error?.code === 4001) {
        this.mensajeDesconexion = 'La desconexión fue cancelada. Tu wallet continúa conectada.';
      } else {
        this.mensajeDesconexion = `No fue posible desconectar la wallet: ${this.obtenerMensajeError(error)}`;
      }

      this.actualizarVista();
    }
  }

  public cerrarModalDesconexion(): void {
    if (this.estadoDesconexion === 'procesando') {
      return;
    }

    this.modalDesconexionVisible = false;
    this.mensajeDesconexion = '';
    this.actualizarVista();
  }

  // =========================================================
  // MODAL DE OPERACIONES EN BLOCKCHAIN
  // =========================================================

  private abrirModalTransaccion(titulo: string, mensaje: string, referencia: string = ''): void {
    this.modalTransaccionVisible = true;
    this.estadoTransaccion = 'esperando';
    this.tituloTransaccion = titulo;
    this.mensajeTransaccion = mensaje;
    this.referenciaTransaccion = referencia;
    this.urlTransaccion = '';
    this.actualizarVista();
    this.ultimaOperacionVisible = false;
    this.ultimaOperacionTitulo = '';
    this.ultimaOperacionDetalle = '';
    this.ultimaOperacionHash = '';
    this.ultimaOperacionUrl = '';
    this.ultimaOperacionFecha = '';
  }

  private confirmarModalTransaccion(titulo: string, mensaje: string, hash: string): void {
    const urlComprobante = this.web3.obtenerUrlTransaccion(hash);

    this.estadoTransaccion = 'confirmada';
    this.tituloTransaccion = titulo;
    this.mensajeTransaccion = mensaje;
    this.urlTransaccion = urlComprobante;

    this.ultimaOperacionVisible = true;
    this.ultimaOperacionTitulo = titulo;
    this.ultimaOperacionDetalle = this.referenciaTransaccion || mensaje;
    this.ultimaOperacionHash = hash;
    this.ultimaOperacionUrl = urlComprobante;
    this.ultimaOperacionFecha = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());

    this.actualizarVista();
  }

  private marcarErrorTransaccion(mensaje: string, error: any): void {
    if (!this.modalTransaccionVisible) {
      return;
    }

    this.estadoTransaccion = 'error';
    this.tituloTransaccion = 'Operación no completada';
    this.mensajeTransaccion = `${mensaje} ${this.obtenerMensajeError(error)}`;
    this.urlTransaccion = '';
    this.actualizarVista();
  }

  public cerrarModalTransaccion(): void {
    if (this.estadoTransaccion === 'esperando') {
      return;
    }

    this.modalTransaccionVisible = false;
    this.estadoTransaccion = 'esperando';
    this.tituloTransaccion = '';
    this.mensajeTransaccion = '';
    this.referenciaTransaccion = '';
    this.urlTransaccion = '';
    this.actualizarVista();
  }

  // =========================================================
  // CARGAR ROL Y DATOS GENERALES DEL CONTRATO
  // =========================================================

  async cargarDatosContrato(desdeInicio: boolean = false): Promise<void> {
    try {
      const cuenta = this.web3.account();

      if (!cuenta) {
        this.mensaje = 'Primero conecta MetaMask.';
        return;
      }

      if (!desdeInicio) {
        this.mensaje = 'Actualizando datos del contrato...';
        this.actualizarVista();
      }

      this.administrador = await this.web3.obtenerAdministrador();
      this.totalMercancias = await this.web3.obtenerTotalMercancias();

      if (cuenta.toLowerCase() === this.administrador.toLowerCase()) {
        this.rolActual = 'Administrador';
      } else {
        this.rolActual = await this.web3.obtenerRol(cuenta);
      }

      this.mercancia = null;
      this.historial = [];
      this.mercanciasVisibles = [];
      this.listaMercanciasCargada = false;
      this.cargandoMercancias = false;
      this.cargandoHistorial = false;

      this.sesionLista = true;

      if (this.rolActual === 'Ninguno') {
        this.mensaje = 'Tu wallet está conectada, pero no tiene un rol asignado en AduanaChain.';
      } else {
        const mensajeAcceso = desdeInicio
          ? `Acceso cargado correctamente. Rol actual: ${this.rolActual}.`
          : 'Datos del contrato actualizados correctamente.';

        this.mensaje = mensajeAcceso;
        this.actualizarVista();

        /*
         * El Centro de Control Aduanal necesita los lotes visibles para calcular
         * indicadores y tareas. Se cargan automáticamente sin exigir
         * que el usuario presione el botón de actualizar lista.
         */
        if (this.puedeConsultar()) {
          await this.cargarMercanciasVisibles(false);
          this.mensaje = mensajeAcceso;
        }
      }
    } catch (error: any) {
      console.error('Error al cargar datos del contrato:', error);

      this.sesionLista = false;
      this.mensaje = `Error al cargar datos: ${this.obtenerMensajeError(error)}`;
    } finally {
      this.iniciandoSesion = false;
      this.actualizarVista();
    }
  }

  // =========================================================
  // ADMINISTRACIÓN DE USUARIOS
  // =========================================================

  async consultarRol(): Promise<void> {
    try {
      const wallet = this.walletUsuario.trim();

      if (!wallet) {
        this.mensaje = 'Ingresa una wallet para consultar su rol.';
        return;
      }

      if (!this.esWalletValida(wallet)) {
        this.mensaje = 'La wallet ingresada no tiene un formato válido.';
        return;
      }

      this.rolConsultado = await this.web3.obtenerRol(wallet);
      this.mensaje = 'Rol consultado correctamente.';
    } catch (error: any) {
      console.error('Error al consultar rol:', error);

      this.mensaje = `Error al consultar rol: ${this.obtenerMensajeError(error)}`;
    } finally {
      this.actualizarVista();
    }
  }

  async registrarUsuario(): Promise<void> {
    try {
      const wallet = this.walletUsuario.trim();

      if (!wallet) {
        this.mensaje = 'Ingresa la wallet del usuario.';
        return;
      }

      if (!this.esWalletValida(wallet)) {
        this.mensaje = 'La wallet ingresada no tiene un formato válido.';
        return;
      }

      this.abrirModalTransaccion(
        'Registrando usuario',
        'Autoriza la operación en MetaMask. AduanaChain registrará el rol asignado en la red Sepolia.',
        `Wallet: ${this.abreviarWallet(wallet)}`,
      );

      this.mensaje = 'Confirma el registro de usuario en MetaMask...';
      this.actualizarVista();

      const hash = await this.web3.registrarUsuario(wallet, Number(this.rolUsuario));

      this.confirmarModalTransaccion(
        'Usuario registrado',
        'La identidad operativa quedó registrada correctamente en blockchain.',
        hash,
      );

      this.rolConsultado = await this.web3.obtenerRol(wallet);

      this.walletUsuario = '';
      this.rolUsuario = 2;
      this.mensaje = 'Usuario registrado correctamente.';
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);

      this.marcarErrorTransaccion('No fue posible registrar el usuario.', error);

      this.mensaje = `Error al registrar usuario: ${this.obtenerMensajeError(error)}`;
    } finally {
      this.actualizarVista();
    }
  }

  // =========================================================
  // REGISTRO DE MERCANCÍA
  // =========================================================

  async registrarMercancia(): Promise<void> {
    try {
      if (!this.descripcion || !this.origen || !this.destino) {
        this.mensaje = 'Selecciona el tipo de mercancía, el origen y el destino aduanal.';
        return;
      }

      const cliente = this.clienteAutorizado.trim();

      if (!cliente) {
        this.mensaje = 'Ingresa la wallet del Cliente Autorizado.';
        return;
      }

      if (!this.esWalletValida(cliente)) {
        this.mensaje = 'La wallet del Cliente Autorizado no tiene un formato válido.';
        return;
      }

      this.abrirModalTransaccion(
        'Registrando mercancía',
        'Autoriza la operación en MetaMask. La carga será incorporada a la trazabilidad verificable en Sepolia.',
        `${this.descripcion} · ${this.origen} → ${this.destino}`,
      );

      this.mensaje = 'Confirma el registro de mercancía en MetaMask...';
      this.actualizarVista();

      const hash = await this.web3.registrarMercancia(
        this.descripcion,
        this.origen,
        this.destino,
        cliente,
      );

      this.confirmarModalTransaccion(
        'Mercancía registrada',
        'La carga fue registrada correctamente y ya cuenta con evidencia blockchain.',
        hash,
      );

      this.descripcion = '';
      this.origen = '';
      this.destino = '';
      this.clienteAutorizado = '';

      this.totalMercancias = await this.web3.obtenerTotalMercancias();

      if (this.listaMercanciasCargada) {
        await this.cargarMercanciasVisibles(false);
      }

      this.mensaje = 'Mercancía registrada correctamente.';
    } catch (error: any) {
      console.error('Error al registrar mercancía:', error);

      this.marcarErrorTransaccion('No fue posible registrar la mercancía.', error);

      this.mensaje = `Error al registrar mercancía: ${this.obtenerMensajeError(error)}`;
    } finally {
      this.actualizarVista();
    }
  }

  // =========================================================
  // AUTORIZACIÓN ADICIONAL POR MERCANCÍA
  // =========================================================

  async autorizarUsuarioMercancia(): Promise<void> {
    try {
      if (this.idMercanciaAutorizar === null || this.idMercanciaAutorizar <= 0) {
        this.mensaje = 'Ingresa un ID de mercancía válido.';
        return;
      }

      const wallet = this.walletAutorizar.trim();

      if (!wallet) {
        this.mensaje = 'Ingresa la wallet que deseas autorizar.';
        return;
      }

      if (!this.esWalletValida(wallet)) {
        this.mensaje = 'La wallet a autorizar no tiene un formato válido.';
        return;
      }

      const idAutorizado = Number(this.idMercanciaAutorizar);

      this.abrirModalTransaccion(
        'Autorizando participante',
        'Autoriza la operación en MetaMask. La wallet quedará vinculada a esta mercancía en Sepolia.',
        `Mercancía #${idAutorizado} · ${this.abreviarWallet(wallet)}`,
      );

      this.mensaje = 'Confirma la autorización en MetaMask...';
      this.actualizarVista();

      const hash = await this.web3.autorizarUsuarioMercancia(idAutorizado, wallet);

      this.confirmarModalTransaccion(
        'Wallet autorizada',
        `El participante quedó autorizado correctamente para la mercancía #${idAutorizado}.`,
        hash,
      );

      if (this.idConsulta === idAutorizado) {
        await this.consultarHistorial();
      }

      if (this.listaMercanciasCargada) {
        await this.cargarMercanciasVisibles(false);
      }

      this.idMercanciaAutorizar = null;
      this.walletAutorizar = '';
      this.mensaje = 'Wallet autorizada correctamente para la mercancía.';
    } catch (error: any) {
      console.error('Error al autorizar wallet:', error);

      this.marcarErrorTransaccion('No fue posible autorizar la wallet.', error);

      this.mensaje = `Error al autorizar wallet: ${this.obtenerMensajeError(error)}`;
    } finally {
      this.actualizarVista();
    }
  }

  // =========================================================
  // CAMBIO DE ESTADO
  // =========================================================

  async cambiarEstado(): Promise<void> {
    try {
      if (this.idEstado === null || this.idEstado <= 0) {
        this.mensaje = 'Ingresa un ID de mercancía válido.';
        return;
      }

      const idActualizado = Number(this.idEstado);
      const estadoSeleccionado = this.obtenerNombreEstadoSeleccionado(Number(this.nuevoEstado));

      this.abrirModalTransaccion(
        'Actualizando estado aduanal',
        'Autoriza la operación en MetaMask. El nuevo estado quedará registrado de forma verificable en Sepolia.',
        `Mercancía #${idActualizado} · Nuevo estado: ${estadoSeleccionado}`,
      );

      this.mensaje = 'Confirma el cambio de estado en MetaMask...';
      this.actualizarVista();

      const hash = await this.web3.cambiarEstado(idActualizado, Number(this.nuevoEstado));

      this.confirmarModalTransaccion(
        'Estado actualizado',
        `La mercancía #${idActualizado} ahora se encuentra en estado ${estadoSeleccionado}.`,
        hash,
      );

      await this.refrescarMercanciaActual(idActualizado);

      this.mensaje = `Estado actualizado correctamente: ${estadoSeleccionado}.`;
    } catch (error: any) {
      console.error('Error al cambiar estado:', error);

      this.marcarErrorTransaccion('No fue posible actualizar el estado.', error);

      this.mensaje = `Error al cambiar estado: ${this.obtenerMensajeError(error)}`;
    } finally {
      this.actualizarVista();
    }
  }

  // =========================================================
  // ENTREGA FINAL
  // =========================================================

  async confirmarEntrega(): Promise<void> {
    try {
      if (this.idEntrega === null || this.idEntrega <= 0) {
        this.mensaje = 'Selecciona o ingresa una mercancía aprobada.';
        return;
      }

      const idEntregado = Number(this.idEntrega);

      this.abrirModalTransaccion(
        'Confirmando entrega final',
        'Autoriza la operación en MetaMask. El cierre del seguimiento será registrado en la red Sepolia.',
        `Mercancía #${idEntregado} · Aprobada → Entregada`,
      );

      this.mensaje = 'Confirma la entrega en MetaMask...';
      this.actualizarVista();

      const hash = await this.web3.cambiarEstado(idEntregado, 3);

      this.confirmarModalTransaccion(
        'Entrega confirmada',
        `El seguimiento de la mercancía #${idEntregado} fue finalizado correctamente en blockchain.`,
        hash,
      );

      await this.refrescarMercanciaActual(idEntregado);

      this.mensaje = 'Entrega confirmada correctamente.';
    } catch (error: any) {
      console.error('Error al confirmar entrega:', error);

      this.marcarErrorTransaccion('No fue posible confirmar la entrega.', error);

      this.mensaje = `Error al confirmar entrega: ${this.obtenerMensajeError(error)}`;
    } finally {
      this.actualizarVista();
    }
  }

  // =========================================================
  // CONSULTA DE MERCANCÍA
  // =========================================================

  async consultarMercancia(): Promise<void> {
    try {
      if (this.idConsulta === null || this.idConsulta <= 0) {
        this.mensaje = 'Ingresa un ID de mercancía válido.';
        return;
      }

      this.mercancia = await this.web3.consultarMercancia(Number(this.idConsulta));

      this.mensaje = 'Mercancía consultada correctamente.';
    } catch (error: any) {
      console.error('Error al consultar mercancía:', error);

      this.mercancia = null;
      this.mensaje = `Error al consultar mercancía: ${this.obtenerMensajeError(error)}`;
    } finally {
      this.actualizarVista();
    }
  }

  // =========================================================
  // HISTORIAL Y COMPROBANTES BLOCKCHAIN
  // =========================================================

  async consultarHistorial(): Promise<void> {
    if (this.cargandoHistorial) {
      return;
    }

    try {
      if (this.idConsulta === null || this.idConsulta <= 0) {
        this.mensaje = 'Ingresa un ID de mercancía válido.';
        return;
      }

      this.cargandoHistorial = true;
      this.mensaje = 'Consultando historial y comprobantes...';
      this.actualizarVista();

      this.historial = await this.web3.consultarComprobantesHistorial(Number(this.idConsulta));

      if (this.historial.length > 0) {
        this.mensaje = 'Historial y comprobantes consultados correctamente.';
      } else {
        this.mensaje = 'No se encontraron movimientos para esta mercancía.';
      }
    } catch (error: any) {
      console.error('Error al consultar historial:', error);

      this.historial = [];
      this.mensaje = `Error al consultar historial: ${this.obtenerMensajeError(error)}`;
    } finally {
      this.cargandoHistorial = false;
      this.actualizarVista();
    }
  }

  // =========================================================
  // LISTA DE MERCANCÍAS VISIBLES
  // =========================================================

  async cargarMercanciasVisibles(mostrarMensaje: boolean = true): Promise<void> {
    const cuenta = this.web3.account();

    if (!cuenta || !this.rolActual) {
      this.mensaje = 'Primero conecta MetaMask y carga los datos del contrato.';
      this.actualizarVista();
      return;
    }

    this.cargandoMercancias = true;
    this.listaMercanciasCargada = false;
    this.mercanciasVisibles = [];

    if (mostrarMensaje) {
      this.mensaje = 'Actualizando mercancías visibles...';
    }

    this.actualizarVista();

    try {
      const total = Number(await this.web3.obtenerTotalMercancias());

      if (total === 0) {
        this.listaMercanciasCargada = true;

        if (mostrarMensaje) {
          this.mensaje = 'No existen mercancías registradas.';
        }

        return;
      }

      const puedeVerTodas =
        this.rolActual === 'Administrador' ||
        this.rolActual === 'Operador' ||
        this.rolActual === 'Autoridad';

      const ids = Array.from({ length: total }, (_, indice) => indice + 1);

      const consultaLotes = async (): Promise<any[]> => {
        if (puedeVerTodas) {
          return await Promise.all(ids.map((id) => this.web3.consultarMercancia(id)));
        }

        const accesos = await Promise.all(
          ids.map(async (id) => ({
            id,
            autorizado: await this.web3.estaAutorizado(id, cuenta),
          })),
        );

        const idsAutorizados = accesos
          .filter((registro) => registro.autorizado)
          .map((registro) => registro.id);

        return await Promise.all(idsAutorizados.map((id) => this.web3.consultarMercancia(id)));
      };

      const limiteEspera = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('La consulta tardó demasiado. Intenta nuevamente.'));
        }, 15000);
      });

      this.mercanciasVisibles = await Promise.race([consultaLotes(), limiteEspera]);

      this.listaMercanciasCargada = true;

      if (mostrarMensaje) {
        if (this.mercanciasVisibles.length === 0) {
          this.mensaje = 'No tienes mercancías autorizadas para consultar.';
        } else {
          this.mensaje = `Se encontraron ${this.mercanciasVisibles.length} mercancía(s) visible(s).`;
        }
      }
    } catch (error: any) {
      console.error('Error cargando mercancías visibles:', error);

      this.listaMercanciasCargada = true;
      this.mensaje = `Error al cargar mercancías: ${this.obtenerMensajeError(error)}`;
    } finally {
      this.cargandoMercancias = false;
      this.actualizarVista();
    }
  }

  // =========================================================
  // SELECCIÓN DESDE LA TABLA
  // =========================================================

  async seleccionarMercancia(id: string | number): Promise<void> {
    const idSeleccionado = Number(id);

    this.idConsulta = idSeleccionado;
    this.idEstado = idSeleccionado;
    this.idEntrega = idSeleccionado;

    await this.consultarMercancia();
    await this.consultarHistorial();
  }

  // =========================================================
  // REFRESCAR DATOS DESPUÉS DE TRANSACCIÓN
  // =========================================================

  private async refrescarMercanciaActual(id: number): Promise<void> {
    if (this.idConsulta === id) {
      await this.consultarMercancia();
      await this.consultarHistorial();
    }

    if (this.listaMercanciasCargada) {
      await this.cargarMercanciasVisibles();
    }
  }

  // =========================================================
  // CENTRO DE CONTROL ADUANAL: INDICADORES Y BANDEJA POR ROL
  // =========================================================

  public contarPorEstado(estado: string): number {
    return this.mercanciasVisibles.filter((lote) => lote.estado === estado).length;
  }

  public obtenerTituloBandeja(): string {
    const titulos: Record<string, string> = {
      Administrador: 'Supervisión general',
      Operador: 'Seguimiento operativo',
      Autoridad: 'Pendientes de revisión',
      Agente: 'Pendientes de entrega',
      'Cliente Autorizado': 'Seguimiento disponible',
    };

    return titulos[this.rolActual] || 'Actividad operativa';
  }

  public obtenerTextoBandeja(): string {
    const textos: Record<string, string> = {
      Administrador: 'Revisa el avance general y atiende las mercancías que continúan en proceso.',
      Operador: 'Registra nuevas cargas y consulta el avance de cada operación aduanal.',
      Autoridad: 'Atiende las mercancías que requieren iniciar revisión o ser aprobadas.',
      Agente: 'Confirma la entrega únicamente de mercancías aprobadas y asignadas a tu wallet.',
      'Cliente Autorizado':
        'Consulta el avance y la evidencia blockchain de tus mercancías autorizadas.',
    };

    return textos[this.rolActual] || 'Consulta el estado actual de los lotes.';
  }

  public obtenerEtiquetaBandeja(): string {
    const cantidad = this.obtenerTareasPrioritarias().length;

    if (this.rolActual === 'Cliente Autorizado') {
      return `${cantidad} en seguimiento`;
    }

    if (this.rolActual === 'Administrador') {
      return `${cantidad} por atender`;
    }

    return `${cantidad} pendiente${cantidad === 1 ? '' : 's'}`;
  }

  public obtenerEncabezadoSinTareas(): string {
    const encabezados: Record<string, string> = {
      Administrador: 'Operación al día',
      Operador: 'Sin seguimiento pendiente',
      Autoridad: 'Revisión al día',
      Agente: 'Operación al día',
      'Cliente Autorizado': 'Sin mercancías disponibles',
    };

    return encabezados[this.rolActual] || 'Sin pendientes';
  }

  public obtenerTareasPrioritarias(): any[] {
    let estadosObjetivo: string[] = [];

    switch (this.rolActual) {
      case 'Administrador':
        estadosObjetivo = ['Registrada', 'En revisión', 'Aprobada'];
        break;
      case 'Operador':
        estadosObjetivo = ['Registrada', 'En revisión'];
        break;
      case 'Autoridad':
        estadosObjetivo = ['Registrada', 'En revisión'];
        break;
      case 'Agente':
        estadosObjetivo = ['Aprobada'];
        break;
      case 'Cliente Autorizado':
        estadosObjetivo = ['Registrada', 'En revisión', 'Aprobada', 'Entregada'];
        break;
      default:
        return [];
    }

    return this.mercanciasVisibles
      .filter((lote) => estadosObjetivo.includes(lote.estado))
      .slice(0, 3);
  }

  public obtenerAccionTarea(lote: any): string {
    if (this.rolActual === 'Autoridad') {
      return lote.estado === 'Registrada' ? 'Iniciar revisión' : 'Revisar aprobación';
    }

    if (this.rolActual === 'Agente') {
      return 'Preparar entrega';
    }

    if (this.rolActual === 'Administrador') {
      return 'Supervisar';
    }

    return 'Ver seguimiento';
  }

  public obtenerMensajeSinTareas(): string {
    const mensajes: Record<string, string> = {
      Administrador: 'No hay lotes operativos pendientes en este momento.',
      Operador: 'No hay cargas registradas pendientes de seguimiento.',
      Autoridad: 'No hay mercancías pendientes de revisión o aprobación.',
      Agente: 'No tienes entregas aprobadas pendientes por confirmar.',
      'Cliente Autorizado': 'No hay mercancías asignadas a esta wallet.',
    };

    return mensajes[this.rolActual] || 'No hay actividad pendiente.';
  }

  // =========================================================
  // PERMISOS DE INTERFAZ SEGÚN ROL
  // =========================================================

  puedeAdministrar(): boolean {
    return this.rolActual === 'Administrador';
  }

  puedeRegistrarMercancia(): boolean {
    return this.rolActual === 'Administrador' || this.rolActual === 'Operador';
  }

  puedeRevisarOAprobar(): boolean {
    return this.rolActual === 'Administrador' || this.rolActual === 'Autoridad';
  }

  puedeConfirmarEntrega(): boolean {
    return this.rolActual === 'Agente';
  }

  puedeConsultar(): boolean {
    return (
      this.rolActual === 'Administrador' ||
      this.rolActual === 'Operador' ||
      this.rolActual === 'Autoridad' ||
      this.rolActual === 'Agente' ||
      this.rolActual === 'Cliente Autorizado'
    );
  }

  // =========================================================
  // TOAST DE COMPROBANTE BLOCKCHAIN
  // =========================================================

  private guardarComprobanteOperacion(hash: string, mensaje: string): void {
    this.mostrarToastComprobante(mensaje, hash);
  }

  private mostrarToastComprobante(mensaje: string, hash: string): void {
    this.toastMensaje = mensaje;
    this.toastUrl = this.web3.obtenerUrlTransaccion(hash);
    this.toastVisible = true;

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      this.toastVisible = false;
      this.actualizarVista();
    }, 7000);

    this.actualizarVista();
  }

  public cerrarToast(): void {
    this.toastVisible = false;

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }

    this.actualizarVista();
  }

  // =========================================================
  // UTILIDADES
  // =========================================================

  private esperar(milisegundos: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milisegundos);
    });
  }

  private limpiarDatosDeSesion(): void {
    this.rolActual = '';
    this.administrador = '';
    this.totalMercancias = '';
    this.rolConsultado = '';

    this.walletUsuario = '';
    this.rolUsuario = 2;

    this.idMercanciaAutorizar = null;
    this.walletAutorizar = '';

    this.descripcion = '';
    this.origen = '';
    this.destino = '';
    this.clienteAutorizado = '';

    this.idConsulta = null;
    this.idEstado = null;
    this.nuevoEstado = 1;
    this.idEntrega = null;

    this.mercancia = null;
    this.historial = [];

    this.mercanciasVisibles = [];
    this.listaMercanciasCargada = false;
    this.cargandoMercancias = false;
    this.cargandoHistorial = false;

    this.cerrarToast();

    this.modalTransaccionVisible = false;
    this.estadoTransaccion = 'esperando';
    this.tituloTransaccion = '';
    this.mensajeTransaccion = '';
    this.referenciaTransaccion = '';
    this.urlTransaccion = '';
  }

  private obtenerNombreEstadoSeleccionado(estado: number): string {
    const estados: Record<number, string> = {
      1: 'En revisión',
      2: 'Aprobada',
      3: 'Entregada',
    };

    return estados[estado] || 'Desconocido';
  }

  private esWalletValida(wallet: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(wallet);
  }

  private obtenerMensajeError(error: any): string {
    return error?.reason || error?.shortMessage || error?.message || 'Error desconocido';
  }

  public abreviarWallet(wallet: string | null): string {
    if (!wallet) {
      return 'Sin conexión';
    }

    if (wallet.length <= 16) {
      return wallet;
    }

    return `${wallet.slice(0, 10)}...${wallet.slice(-8)}`;
  }

  public abreviarHash(hash: string): string {
    if (!hash) {
      return '';
    }

    if (hash.length <= 22) {
      return hash;
    }

    return `${hash.slice(0, 12)}...${hash.slice(-10)}`;
  }

  private actualizarVista(): void {
    this.cdr.detectChanges();
  }
}
