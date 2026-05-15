import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-inventario-hub',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inventario-hub.component.html',
  styleUrl: './inventario-hub.component.css',
})
export class InventarioHubComponent {
  readonly isDueno = inject(AuthService).isDueno;
}
