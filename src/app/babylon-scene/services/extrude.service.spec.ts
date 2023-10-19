import { TestBed } from '@angular/core/testing';

import { ExtrudeService } from './extrude.service';

describe('ExtrudeService', () => {
  let service: ExtrudeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExtrudeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
