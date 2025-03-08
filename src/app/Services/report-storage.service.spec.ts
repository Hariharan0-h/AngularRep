import { TestBed } from '@angular/core/testing';

import { ReportStorageService } from './report-storage.service';

describe('ReportStorageService', () => {
  let service: ReportStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
