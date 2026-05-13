import { Component } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { SideNav } from './shared/components/side-nav/side-nav';
import { TopNav } from './shared/components/top-nav/top-nav';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SideNav, TopNav, CommonModule, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  title = 'kayan-furniturer';
  showNav = true;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      this.showNav = !url.includes('/login') && !url.includes('/register');
    });
  }
}
