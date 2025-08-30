import { Component } from '@angular/core';
import { SharedModule } from '../../shared.module';

@Component({
  selector: 'app-navbar',
  imports: [SharedModule],
  templateUrl: './navbar.html',
})
export class Navbar {}
