import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faCalendarDays,
  faClock,
  faLocationDot,
  faTicket,
  faCircleInfo
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-registration-details',
  imports: [RouterLink, FontAwesomeModule],
  templateUrl: './registration-details.html',
  styleUrl: './registration-details.css',
})
export class RegistrationDetails {
  private readonly route = inject(ActivatedRoute);

  readonly faArrowLeft = faArrowLeft;
  readonly faCalendarDays = faCalendarDays;
  readonly faClock = faClock;
  readonly faLocationDot = faLocationDot;
  readonly faTicket = faTicket;
  readonly faCircleInfo = faCircleInfo;

  readonly registrationId = computed(
    () => this.route.snapshot.paramMap.get('id') ?? ''
  );

  // The registration API has not been connected yet.
  // Do not display fabricated registration details.
}
