import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostBinding, Input, OnInit, Output } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  standalone: true
})
export class SidebarComponent implements OnInit {
  @Input() appName: string = 'Auro BI'; // Default value as fallback
  @Output() sidebarToggled = new EventEmitter<boolean>();

  @HostBinding('class.open') 
  get isOpen(): boolean {
    return this.isSidebarOpen;
  }
  
  isSidebarOpen = false;
  currentRoute = '';
  
  menuItems = [
    //{ label: 'Home', route: '/home' },
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Reports', route: '/reports' },
    { label: 'Files', route: '/files' }
  ];
  
  constructor(private router: Router) {}
  
  ngOnInit() {
    // Track current route for active menu highlighting
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
    });
    
    // Set initial route
    this.currentRoute = this.router.url;
  }
  
  navigate(route: string) {
    this.router.navigate([route]);
    this.isSidebarOpen = false;
    // Optional: Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      this.toggleSidebar();
    }
  }
  
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.sidebarToggled.emit(this.isSidebarOpen);
  }
}