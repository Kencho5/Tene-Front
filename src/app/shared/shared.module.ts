import { NgModule } from '@angular/core';
import { RouterLink, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [RouterOutlet, RouterLink, RouterModule, CommonModule],
  exports: [RouterOutlet, RouterLink, RouterModule, CommonModule],
})
export class SharedModule {}
