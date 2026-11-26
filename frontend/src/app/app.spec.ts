import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideConfig } from '@lucide/angular';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideLucideConfig({ size: 18, strokeWidth: 1.75 })],
    }).compileComponents();
  });

  it('should create the root application shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
