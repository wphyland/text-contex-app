import {Component, OnDestroy} from '@angular/core';
import { FormControl } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {Observable, forkJoin, takeUntil, Subject} from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import {SentimentResponse} from './interfaces/sentiment-response';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  inputText = '';
  sentimentResult: SentimentResponse | null = null;
  summaryResult: string = '';
  isLoading = false;
  labels: string[] = ['Politics', 'Economics', 'Insult', 'Cooking'];
  selectedLabels: string[] = [];
  labelControl = new FormControl();
  filteredLabels: Observable<string[]>;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  destroy$: Subject<void> = new Subject<void>();

  constructor(private httpClient: HttpClient) {
    this.filteredLabels = this.labelControl.valueChanges.pipe(
      startWith(''),
      map((label: string | null) => label ? this._filter(label) : this.labels.slice())
    );
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.labels.filter(label => label.toLowerCase().includes(filterValue));
  }

  addLabel(event: any): void {
    const input = event.input;
    const value = event.value.trim();

    if (value && this.selectedLabels.indexOf(value) === -1) {
      this.selectedLabels.push(value);
    }

    if (input) {
      input.value = '';
    }

    this.labelControl.setValue(null);
  }

  removeLabel(label: string): void {
    const index = this.selectedLabels.indexOf(label);
    if (index >= 0) {
      this.selectedLabels.splice(index, 1);
    }
  }

  selectLabel(event: any): void {
    const value = event.option.viewValue;
    if (this.selectedLabels.indexOf(value) === -1) {
      this.selectedLabels.push(value);
    }
    this.labelControl.setValue(null);
  }

  handleResponses(sentimentResponse: Array<SentimentResponse>, summarizeResponse: Array<{summary_text: string}>) {
    if (sentimentResponse && sentimentResponse.length > 0) {
      this.sentimentResult = sentimentResponse[0];
    }

    if (summarizeResponse && summarizeResponse[0].summary_text) {
      this.summaryResult = summarizeResponse[0].summary_text;
    }
    this.isLoading = false;
  }

  onMagicClick() {
    this.sentimentResult = null;
    this.summaryResult = '';
    this.isLoading = true;

    const sentimentRequest = this.httpClient.post('http://127.0.0.1:8000/text/sentiment', {
      text: this.inputText,
    });

    const summarizeRequest = this.httpClient.post('http://127.0.0.1:8000/text/summarize', {
      text: this.inputText,
    });

    forkJoin([sentimentRequest, summarizeRequest]).pipe(takeUntil(this.destroy$)).subscribe(
      ([sentimentRes, summarizeRes]: [any, any]) => {
        this.handleResponses(sentimentRes, summarizeRes);
      },
      error => {
        console.error('Error fetching data:', error);
        this.isLoading = false;
      }
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
