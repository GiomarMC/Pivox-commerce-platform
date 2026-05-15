import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { FinanzasService } from '../../finanzas.service';

interface HubItem {
  label: string;
  description: string;
  iconKey: string;
  bg: string;
  color: string;
  route: string;
  duenioOnly?: boolean;
}

const HUB_ITEMS: HubItem[] = [
  { label: 'Resumen de caja',  description: 'Ventas y servicios del día',    iconKey: 'cash',    bg: '#EEF0FB', color: '#1F2A7C', route: '/finanzas/caja/resumen' },
  { label: 'Cierre de caja',   description: 'Cerrar la caja del día',        iconKey: 'lock',    bg: '#FEE2E2', color: '#DC2626', route: '/finanzas/caja/cierre' },
  { label: 'Deudas',           description: 'Gestionar créditos pendientes', iconKey: 'debt',    bg: '#FEF3C7', color: '#D97706', route: '/finanzas/deudas' },
  { label: 'Historial de pagos', description: 'Ver pagos registrados',       iconKey: 'history', bg: '#DCFCE7', color: '#15803D', route: '/finanzas/pago-resumen' },
  { label: 'Gastos',           description: 'Gastos fijos y variables',      iconKey: 'chart',   bg: '#E0F2FE', color: '#0284C7', route: '/finanzas/gastos', duenioOnly: true },
];

@Component({
  selector: 'app-finanzas-hub',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './finanzas-hub.component.html',
  styleUrl: './finanzas-hub.component.css',
})
export class FinanzasHubComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly svc = inject(FinanzasService);
  readonly isDueno = this.auth.isDueno;

  get caja() { return this.svc.state().cajaResumen; }

  get deudasActivas() {
    return this.svc.state().deudasDashboard.filter(d => d.estado === 'ACTIVA');
  }

  get saldoDeudas(): string {
    const total = this.deudasActivas.reduce((acc, d) => acc + parseFloat(d.saldo || '0'), 0);
    return total.toFixed(2);
  }

  get metodosPago(): { label: string; value: string }[] {
    const c = this.caja;
    if (!c) return [];
    return [
      { label: 'Efectivo',      value: c.totalEfectivo },
      { label: 'Yape',          value: c.totalYape },
      { label: 'Plin',          value: c.totalPlin },
      { label: 'Transferencia', value: c.totalTransferencia },
      { label: 'Tarjeta',       value: c.totalTarjeta },
    ].filter(m => parseFloat(m.value) > 0);
  }

  get ventasPorc(): number {
    const c = this.caja;
    if (!c) return 0;
    const v = parseFloat(c.resumenVentas?.totalGeneral ?? '0');
    const s = parseFloat(c.resumenServicios?.totalGeneral ?? '0');
    const total = v + s;
    return total > 0 ? Math.round((v / total) * 100) : 0;
  }

  get serviciosPorc(): number {
    return 100 - this.ventasPorc;
  }

  get fechaHoy(): string {
    return new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  ngOnInit(): void {
    this.svc.cargarCajaResumen();
    this.svc.cargarDeudasDashboard();
  }

  visibleItems(): HubItem[] {
    return HUB_ITEMS.filter(item => !item.duenioOnly || this.isDueno());
  }
}
