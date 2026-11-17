import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { EventItem } from '../../models/event.model';
import { EventPayload } from '../../services/event-api';
import {
  browserTimeZone,
  fromLocalInputValue,
  toLocalInputValue
} from '../../utils/datetime';

type FieldName =
  | 'title'
  | 'description'
  | 'date'
  | 'endDate'
  | 'location'
  | 'imageUrl'
  | 'capacity'
  | 'status';

interface StatusOption {
  value: EventPayload['status'];
  title: string;
  hint: string;
}

const IMAGE_URL_PATTERN = /^(https?:\/\/\S+|\/(?!\/)\S+)$/i;
const TWO_HOURS = 2 * 60 * 60 * 1000;

function notBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim()
    ? null
    : { required: true };
}

function imageUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();

  if (!value) return null;
  if (value.length > 500) return { maxlength: true };

  return IMAGE_URL_PATTERN.test(value) ? null : { pattern: true };
}

@Component({
  selector: 'app-event-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './event-form.html',
  styleUrl: './event-form.css'
})
export class EventForm implements OnInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  // ---------- Inputs / outputs ----------
  readonly mode = input<'create' | 'edit'>('create');
  readonly event = input<EventItem | null>(null);
  readonly submitting = input(false);
  readonly serverError = input('');
  readonly save = output<EventPayload>();

  readonly timeZone = browserTimeZone();
  readonly attempted = signal(false);
  readonly previewFailed = signal(false);

  // ---------- Form ----------
  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(100)]
    }),
    description: new FormControl('', { nonNullable: true }),
    date: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, (c) => this.startValidator(c)]
    }),
    endDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, (c) => this.endValidator(c)]
    }),
    location: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    imageUrl: new FormControl('', {
      nonNullable: true,
      validators: [imageUrlValidator]
    }),
    capacity: new FormControl<number | null>(null, [
      Validators.required,
      (c) => this.capacityValidator(c)
    ]),
    status: new FormControl<EventPayload['status']>('published', {
      nonNullable: true
    })
  });

  // ---------- Derived state ----------
  readonly imageUrlValue = toSignal(this.form.controls.imageUrl.valueChanges, {
    initialValue: ''
  });

  readonly previewUrl = computed(() => {
    const url = this.imageUrlValue().trim();
    return IMAGE_URL_PATTERN.test(url) ? url : '';
  });

  // New events must start in the future: let the picker grey out the past
  readonly minStart = computed(() =>
    this.mode() === 'create' ? toLocalInputValue(new Date()) : null
  );

  readonly statusOptions = computed<StatusOption[]>(() => {
    const options: StatusOption[] = [
      {
        value: 'published',
        title: 'Published',
        hint: 'Visible to everyone and open for registration.'
      },
      {
        value: 'draft',
        title: 'Draft',
        hint: 'Only you can see it. Publish when you are ready.'
      }
    ];

    if (this.event()?.status === 'cancelled') {
      options.push({
        value: 'cancelled',
        title: 'Cancelled',
        hint: 'Shown as cancelled. Attendees cannot register.'
      });
    }

    return options;
  });

  ngOnInit(): void {
    const item = this.event();

    if (item) {
      this.form.patchValue({
        title: item.title,
        description: item.description ?? '',
        date: toLocalInputValue(item.date),
        endDate: toLocalInputValue(item.endDate || item.date),
        location: item.location,
        imageUrl: item.imageUrl ?? '',
        capacity: item.capacity,
        status: item.status
      });
    }

    // Subscribe after the initial fill so it does not interfere with it
    this.form.controls.date.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const end = this.form.controls.endDate;
        const start = fromLocalInputValue(value);

        // Convenience: an empty end time defaults to start + 2 hours
        if (start && !end.value) {
          end.setValue(toLocalInputValue(new Date(new Date(start).getTime() + TWO_HOURS)));
        }

        end.updateValueAndValidity(); // the end must be re-checked against the new start
      });

    this.form.controls.imageUrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.previewFailed.set(false));
  }

  // ---------- Validators ----------
  private startValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');

    if (!value) return null; // "required" reports empty values

    const iso = fromLocalInputValue(value);
    if (!iso) return { invalidDate: true };

    // While editing, an unchanged start time is always allowed (the event may
    // already be running). A changed start time must be in the future.
    const original = this.event();
    const unchanged = !!original && toLocalInputValue(original.date) === value;

    if (!unchanged && new Date(iso).getTime() <= Date.now()) {
      return { startInPast: true };
    }

    return null;
  }

  private endValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');

    if (!value) return null;

    const end = fromLocalInputValue(value);
    if (!end) return { invalidDate: true };

    const start = fromLocalInputValue(
      String(control.parent?.get('date')?.value ?? '')
    );

    if (start && new Date(end).getTime() <= new Date(start).getTime()) {
      return { endBeforeStart: true };
    }

    return null;
  }

  private capacityValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (value === null || value === '') return null; // "required" reports it

    const number = Number(value);

    if (!Number.isInteger(number) || number < 1) {
      return { capacityInvalid: true };
    }

    if (number < (this.event()?.registeredCount ?? 0)) {
      return { belowRegistered: true };
    }

    return null;
  }

  // ---------- Template helpers ----------
  invalid(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.attempted());
  }

  errorMessage(name: FieldName): string {
    const errors = this.form.controls[name].errors;

    if (!errors) return '';

    switch (name) {
      case 'title':
        return errors['required']
          ? 'Title is required.'
          : 'Title must be 100 characters or fewer.';
      case 'date':
        if (errors['required']) return 'Choose a start date and time.';
        if (errors['startInPast']) return 'The start time must be in the future.';
        return 'Enter a valid date and time.';
      case 'endDate':
        if (errors['required']) return 'Choose an end date and time.';
        if (errors['endBeforeStart']) return 'The end time must be after the start time.';
        return 'Enter a valid date and time.';
      case 'location':
        return 'Location is required.';
      case 'imageUrl':
        return errors['maxlength']
          ? 'The link is too long (500 characters at most).'
          : 'Enter a link starting with http:// or https://, or a path starting with /.';
      case 'capacity':
        if (errors['required']) return 'Capacity is required.';
        if (errors['belowRegistered']) {
          return `Capacity can't be lower than the ${this.event()?.registeredCount} people already registered.`;
        }
        return 'Enter a whole number of at least 1.';
      default:
        return '';
    }
  }

  onSubmit(): void {
    if (this.submitting()) return;

    this.attempted.set(true);
    this.form.markAllAsTouched();
    this.form.controls.date.updateValueAndValidity(); // refresh the "in the future" check

    if (this.form.invalid) {
      // After the error styles are rendered, move focus to the first problem
      afterNextRender(
        () => this.host.nativeElement.querySelector<HTMLElement>('.invalid')?.focus(),
        { injector: this.injector }
      );
      return;
    }

    const value = this.form.getRawValue();
    const start = fromLocalInputValue(value.date);
    const end = fromLocalInputValue(value.endDate);

    if (!start || !end || value.capacity === null) return;

    this.save.emit({
      title: value.title.trim(),
      description: value.description.trim(),
      date: start,
      endDate: end,
      location: value.location.trim(),
      imageUrl: value.imageUrl.trim(),
      capacity: value.capacity,
      status: value.status
    });
  }
}