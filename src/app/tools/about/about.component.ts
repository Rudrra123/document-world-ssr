import { Component, OnInit } from '@angular/core';
import * as AOS from 'aos';

@Component({
  selector: 'app-root',
   templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})

export class AboutComponent  implements OnInit {

   ngOnInit(): void {
    AOS.init({
      duration: 1000,
      easing: 'ease-out',
      once: true
    });
  }

}
