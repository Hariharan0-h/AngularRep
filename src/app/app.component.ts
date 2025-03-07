import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from "./Components/sidebar/sidebar.component";
import { DashboardComponent } from './Components/dashboard/dashboard.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'NewApp';
  appName = 'Auro BI';
}
