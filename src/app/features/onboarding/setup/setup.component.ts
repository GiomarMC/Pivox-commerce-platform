import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OnboardingService } from '../onboarding.service';
import { InvitationService } from '../../invitation/invitation.service';
import { CopyLinkButtonComponent } from '../../../shared/components/copy-link-button/copy-link-button.component';
import { Roles } from '../../../core/auth/auth.models';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [ReactiveFormsModule, CopyLinkButtonComponent],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.css',
})
export class SetupComponent implements OnInit {
  readonly svc = inject(OnboardingService);
  readonly inviteSvc = inject(InvitationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly Roles = Roles;

  formEmpresa = this.fb.group({
    nombre: ['', Validators.required],
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
  });

  formTienda = this.fb.group({
    nombre: ['', Validators.required],
    direccion: ['', Validators.required],
    ubigeo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    serieFactura: ['F001', Validators.required],
    serieBoleta: ['B001', Validators.required],
    serieTicket: ['T001', Validators.required],
  });

  formInvitacion = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    rol: ['', Validators.required],
    salario: [null as number | null],
  });

  ngOnInit(): void {
    this.svc.clearMessages();
    this.inviteSvc.reset();
  }

  async submitEmpresa(): Promise<void> {
    this.formEmpresa.markAllAsTouched();
    if (this.formEmpresa.invalid) return;
    this.svc.clearMessages();
    await this.svc.crearEmpresa(
      this.formEmpresa.value['nombre']!,
      this.formEmpresa.value['ruc']!,
    );
  }

  async submitTienda(): Promise<void> {
    this.formTienda.markAllAsTouched();
    if (this.formTienda.invalid) return;
    this.svc.clearMessages();

    await this.svc.crearTienda(
      this.formTienda.value['nombre']!,
      this.formTienda.value['direccion']!,
      this.formTienda.value['ubigeo']!,
      this.formTienda.value['serieFactura']!,
      this.formTienda.value['serieBoleta']!,
      this.formTienda.value['serieTicket']!,
    );
  }

  async submitInvitacion(): Promise<void> {
    this.formInvitacion.markAllAsTouched();
    if (this.formInvitacion.invalid) return;
    this.inviteSvc.clearMessages();

    const { email, rol, salario } = this.formInvitacion.value;
    await this.inviteSvc.crearInvitacion(
      email!,
      rol!,
      this.svc.state().tiendaIdRecienCreada ?? undefined,
      salario ?? undefined,
    );
  }

  nuevaInvitacion(): void {
    this.inviteSvc.reset();
    this.formInvitacion.reset();
  }

  irAlPanel(): void {
    void this.router.navigate(['/home']);
  }
}
