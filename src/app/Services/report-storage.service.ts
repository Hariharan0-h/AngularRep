import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ReportFile } from '../Model/report-file';
import { Observable } from 'rxjs/internal/Observable';
import { catchError, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportStorageService{
  private apiUrl = 'api/files'; // Replace with your actual API endpoint

  constructor(private http: HttpClient) { }

  /**
   * Get all files
   */
  getFiles(): Observable<ReportFile[]> {
    return this.http.get<ReportFile[]>(this.apiUrl)
      .pipe(
        catchError(this.handleError<ReportFile[]>('getFiles', []))
      );
  }

  /**
   * Get a file by id
   */
  getFile(id: string): Observable<ReportFile> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<ReportFile>(url)
      .pipe(
        catchError(this.handleError<ReportFile>(`getFile id=${id}`))
      );
  }

  /**
   * Upload a file
   */
  uploadFile(file: File, metadata?: Partial<ReportFile>): Observable<HttpEvent<any>> {
    const formData: FormData = new FormData();
    formData.append('file', file);
    
    // Add metadata if available
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const req = new HttpRequest('POST', this.apiUrl, formData, {
      reportProgress: true
    });

    return this.http.request(req);
  }

  /**
   * Delete a file
   */
  deleteFile(id: string): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete(url)
      .pipe(
        catchError(this.handleError('deleteFile'))
      );
  }

  /**
   * Update file metadata
   */
  updateFileMetadata(id: string, metadata: Partial<ReportFile>): Observable<ReportFile> {
    const url = `${this.apiUrl}/${id}/metadata`;
    return this.http.patch<ReportFile>(url, metadata)
      .pipe(
        catchError(this.handleError<ReportFile>('updateFileMetadata'))
      );
  }

  /**
   * Download a file
   */
  downloadFile(id: string): Observable<Blob> {
    const url = `${this.apiUrl}/${id}/download`;
    return this.http.get(url, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError<Blob>('downloadFile'))
    );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      
      // Let the app keep running by returning an empty result
      return error.status === 404 ? of(result as T) : throwError(() => error);
    };
  }
}
