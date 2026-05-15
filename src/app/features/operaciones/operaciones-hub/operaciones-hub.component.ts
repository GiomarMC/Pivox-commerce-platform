import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-operaciones-hub',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './operaciones-hub.component.html',
  styleUrl: './operaciones-hub.component.css',
})
export class OperacionesHubComponent {
  readonly auth = inject(AuthService);
  readonly userMe = this.auth.userMe;
}
