import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import { RegistrationApi } from '../../services/registration-api';
import {
  RegistrationItem,
  STATUS_LABELS,
  getDisplayStatus,
  getReference
} from '../../models/registration.model';
import { getErrorMessage } from '../../utils/http-error';

@Component({
  selector: 'app-registration-details',
  imports: [DatePipe, RouterLink, FontAwesomeModule],
  templateUrl: './registration-details.html',
  styleUrl: './registration-details.css'
})
export class RegistrationDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly registrationApi = inject(RegistrationApi);

  readonly faArrowLeft = faArrowLeft;

  readonly registration = signal<RegistrationItem | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  readonly actionError = signal('');
  readonly cancelling = signal(false);
  readonly confirmingCancel = signal(false);

  readonly status = computed(() => {
    const item = this.registration();
    return item ? getDisplayStatus(item) : null;
  });

  readonly statusLabel = computed(() => {
    const status = this.status();
    return status ? STATUS_LABELS[status] : '';
  });

  readonly reference = computed(() => {
    const item = this.registration();
    return item ? getReference(item) : '';
  });

  readonly canCancel = computed(() => {
    const item = this.registration();

    return (
      !!item &&
      item.status === 'confirmed' &&
      item.event.status !== 'cancelled' &&
      new Date(item.event.date).getTime() > Date.now()
    );
  });

  // A short explanation that depends on the current state
  readonly notice = computed(() => {
    const item = this.registration();

    if (!item) return '';

    if (item.status === 'cancelled') {
      return 'You cancelled this registration. You can register again from the event page while spots are available.';
    }
    if (item.event.status === 'cancelled') {
      return 'The organiser has cancelled this event.';
    }
    if (new Date(item.event.endDate).getTime() < Date.now()) {
      return 'This event has finished.';
    }
    if (!this.canCancel()) {
      return 'This event has already started, so the registration can no longer be cancelled.';
    }

    return '';
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        this.errorMessage.set('No registration ID was provided.');
        this.loading.set(false);
        return;
      }

      this.load(id);
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.actionError.set('');
    this.confirmingCancel.set(false);
    this.registration.set(null);

    this.registrationApi.getById(id).subscribe({
      next: (response) => {
        this.registration.set(response.data);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          getErrorMessage(error, 'We could not load this registration.')
        );
        this.loading.set(false);
      }
    });
  }

  cancel(): void {
    const item = this.registration();

    if (!item || this.cancelling()) {
      return;
    }

    this.cancelling.set(true);
    this.actionError.set('');

    this.registrationApi.cancel(item._id).subscribe({
      next: (response) => {
        this.registration.set(response.data);
        this.confirmingCancel.set(false);
        this.cancelling.set(false);
      },
      error: (error: unknown) => {
        this.actionError.set(
          getErrorMessage(error, 'Could not cancel this registration.')
        );
        this.confirmingCancel.set(false);
        this.cancelling.set(false);
        this.load(item._id);
      }
    });
  }
}