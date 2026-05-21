import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { InvitationService } from '../../invitation.service';

function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? '';
  const ok =
    v.length >= 8 &&
    /[A-Z]/.test(v) &&
    /[a-z]/.test(v) &&
    /[0-9]/.test(v) &&
    /[^A-Za-z0-9]/.test(v);
  return ok ? null : { passwordStrength: true };
}

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-invitation-accept',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './invitation-accept.component.html',
  styleUrl: './invitation-accept.component.css',
})
export class InvitationAcceptComponent implements OnInit {
  readonly svc = inject(InvitationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly token = signal<string | null>(null);

  form = this.fb.group(
    {
      password: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  readonly passwordVal = toSignal(
    this.form.controls['password'].valueChanges,
    { initialValue: '' },
  );

  readonly passwordReqs = computed(() => {
    const v: string = this.passwordVal() ?? '';
    return [
      { label: 'Mínimo 8 caracteres', ok: v.length >= 8 },
      { label: 'Una letra mayúscula', ok: /[A-Z]/.test(v) },
      { label: 'Una letra minúscula', ok: /[a-z]/.test(v) },
      { label: 'Un número', ok: /[0-9]/.test(v) },
      { label: 'Un carácter especial', ok: /[^A-Za-z0-9]/.test(v) },
    ];
  });

  readonly passwordStrength = computed(() => {
    const met = this.passwordReqs().filter(r => r.ok).length;
    return Math.round((met / this.passwordReqs().length) * 100);
  });

  readonly strengthLabel = computed(() => {
    const s = this.passwordStrength();
    if (s <= 20) return 'Muy débil';
    if (s <= 40) return 'Débil';
    if (s <= 60) return 'Regular';
    if (s <= 80) return 'Buena';
    return 'Fuerte';
  });

  readonly strengthColor = computed(() => {
    const s = this.passwordStrength();
    if (s <= 20) return '#EF4444';
    if (s <= 40) return '#F97316';
    if (s <= 60) return '#F59E0B';
    if (s <= 80) return '#6366F1';
    return '#10B981';
  });

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token');
    this.token.set(t);
    this.svc.reset();
    if (t) void this.svc.validarToken(t);
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.token()) return;
    await this.svc.completarInvitacion(
      this.token()!,
      this.form.value['password']!,
      this.form.value['confirmPassword']!,
    );
  }

  irAlLogin(): void {
    void this.router.navigate(['/login']);
  }
}
