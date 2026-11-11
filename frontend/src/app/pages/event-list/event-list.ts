import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { EventApi } from '../../services/event-api';
import { EventItem } from '../../models/event.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faClock,
  faLocationDot,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-event-list',
  imports: [DatePipe, FontAwesomeModule, RouterLink],
  templateUrl: './event-list.html',
  styleUrl: './event-list.css'
})
export class EventList implements OnInit {
  private readonly eventApi = inject(EventApi);

  readonly faClock = faClock;
  readonly faLocationDot = faLocationDot;
  readonly faArrowRight = faArrowRight;

  readonly events = signal<EventItem[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly searchTerm = signal('');

  // Events whose image failed to load fall back to the hatch placeholder
  readonly failedImages = signal<ReadonlySet<string>>(new Set<string>());

  hasImageError(id: string): boolean {
    return this.failedImages().has(id);
  }

  markImageError(id: string): void {
    this.failedImages.update((ids) => new Set(ids).add(id));
  }

  readonly filteredEvents = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    if (!term) {
      return this.events();
    }

    return this.events().filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.location.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.eventApi.getEvents().subscribe({
      next: (response) => {
        this.events.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load events. Is the backend running?');
        this.loading.set(false);
      }
    });
  }
  onSearch(value: string): void {
    this.searchTerm.set(value);
  }
}