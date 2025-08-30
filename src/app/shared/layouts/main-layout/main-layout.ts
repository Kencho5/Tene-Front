import { Component } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-main-layout',
  imports: [SharedModule, Navbar],
  templateUrl: './main-layout.html',
})
export class MainLayout {}
