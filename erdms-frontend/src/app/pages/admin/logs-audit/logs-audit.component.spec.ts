import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogsAuditComponent } from './logs-audit.component';

describe('LogsAuditComponent', () => {
  let component: LogsAuditComponent;
  let fixture: ComponentFixture<LogsAuditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogsAuditComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LogsAuditComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
