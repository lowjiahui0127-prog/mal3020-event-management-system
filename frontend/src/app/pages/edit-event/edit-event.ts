import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import { EventApi, EventPayload } from '../../services/event-api';
import { AuthService } from '../../services/auth.service';
import { EventItem } from '../../models/event.model';
import { EventForm } from '../../components/event-form/event-form';
import { getErrorMessage } from '../../utils/http-error';

@Component({
  selector: 'app-edit-event',
  imports: [RouterLink, FontAwesomeModule, EventForm],
  templateUrl: './edit-event.html',
  styleUrl: './edit-event.css'
})
export class EditEvent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventApi = inject(EventApi);
  private readonly auth = inject(AuthService);

  readonly faArrowLeft = faArrowLeft;

  readonly event = signal<EventItem | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly submitting = signal(false);
  readonly serverError = signal('');

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        this.errorMessage.set('No event ID was provided.');
        this.loading.set(false);
        return;
      }

      this.load(id);
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.serverError.set('');
    this.event.set(null);

    this.eventApi.getEventById(id).subscribe({
      next: (response) => {
        const item = response.data;
        const me = this.auth.currentUser();

        if (!item) {
          this.errorMessage.set('Event not found.');
        } else if (!me || item.createdBy !== me._id) {
          this.errorMessage.set('You can only edit events that you created.');
        } else {
          this.event.set(item);
        }

        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getErrorMessage(error, 'Could not load this event.'));
        this.loading.set(false);
      }
    });
  }

  save(payload: EventPayload): void {
    const item = this.event();

    if (!item || this.submitting()) return;

    this.submitting.set(true);
    this.serverError.set('');

    this.eventApi.updateEvent(item._id, payload).subscribe({
      next: (response) => {
        void this.router.navigate(['/organiser/events'], {
          state: { notice: `Changes to "${response.data.title}" were saved.` }
        });
      },
      error: (error: unknown) => {
        this.serverError.set(
          getErrorMessage(error, 'Could not save your changes. Please try again.')
        );
        this.submitting.set(false);
      }
    });
  }
}