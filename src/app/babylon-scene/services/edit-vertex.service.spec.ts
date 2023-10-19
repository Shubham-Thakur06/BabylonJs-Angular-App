import { TestBed } from '@angular/core/testing';

import { EditVertexService } from './edit-vertex.service';

describe('EditVertexService', () => {
  let service: EditVertexService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditVertexService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
