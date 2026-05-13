import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-nav.component.html',
  styles: [`
    .active {
      @apply bg-[#2a2a2a] text-[#e8c46a] rounded-l-3xl -translate-x-2;
      span {
        font-variation-settings: 'FILL' 1;
      }
    }
  `]
})
export class SideNavComponent {}
