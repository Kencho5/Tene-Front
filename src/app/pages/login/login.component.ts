import { Component, inject, OnInit } from '@angular/core';
import { AuthTitleService } from '@core/services/auth-title.service';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private authTitleService = inject(AuthTitleService);

  ngOnInit() {
    this.authTitleService.setTitle('ავტორიზაცია');
  }
}
