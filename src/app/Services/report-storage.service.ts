import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ReportFile } from '../Model/report-file';
import { Observable } from 'rxjs/internal/Observable';
import { catchError, map, of, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid'; // You may need to install this package

@Injectable({
  providedIn: 'root'
})
export class ReportStorageService {
  private apiUrl = 'api/reports'; // Changed from 'api/files' to match functionality
  private currentReportConfig: any = null;
  private localStorageKey = 'savedReports';

  constructor(private http: HttpClient) { }

  /**
   * Get all report files
   */
  getAllReports(): Observable<ReportFile[]> {
    // For now, we'll simulate with localStorage, but this could use HTTP in production
    return of(this.getReportsFromStorage());
  }

  /**
   * Get a report by id
   */
  getReport(id: string): Observable<ReportFile> {
    const reports = this.getReportsFromStorage();
    const report = reports.find(r => r.id === id);
    
    if (report) {
      return of(report);
    } else {
      return throwError(() => new Error(`Report with id=${id} not found`));
    }
  }

  /**
   * Save a report
   */
  saveReport(report: ReportFile): Observable<ReportFile> {
    const reports = this.getReportsFromStorage();
    const index = reports.findIndex(r => r.id === report.id);
    
    if (index >= 0) {
      reports[index] = report;
    } else {
      reports.push(report);
    }
    
    localStorage.setItem(this.localStorageKey, JSON.stringify(reports));
    return of(report);
  }

  /**
   * Delete a report
   */
  deleteReport(id: string): Observable<boolean> {
    const reports = this.getReportsFromStorage();
    const filteredReports = reports.filter(r => r.id !== id);
    
    localStorage.setItem(this.localStorageKey, JSON.stringify(filteredReports));
    return of(true);
  }

  /**
   * Get the current report configuration
   */
  getCurrentReportConfig(): any {
    return this.currentReportConfig;
  }

  /**
   * Set the current report configuration
   */
  setCurrentReportConfig(config: any): void {
    this.currentReportConfig = config;
  }

  /**
   * Generate a unique ID for new reports
   */
  generateUniqueId(): string {
    return uuidv4(); // Using UUID v4 for unique IDs
  }

  /**
   * Helper method to get reports from localStorage
   */
  private getReportsFromStorage(): ReportFile[] {
    const storedReports = localStorage.getItem(this.localStorageKey);
    return storedReports ? JSON.parse(storedReports) : [];
  }

  // Keeping original methods for reference and backward compatibility
  
  getFiles(): Observable<ReportFile[]> {
    return this.getAllReports();
  }

  getFile(id: string): Observable<ReportFile> {
    return this.getReport(id);
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
    return this.deleteReport(id);
  }

  /**
   * Update file metadata
   */
  updateFileMetadata(id: string, metadata: Partial<ReportFile>): Observable<ReportFile> {
    return this.getReport(id).pipe(
      map(report => {
        const updatedReport = { ...report, ...metadata };
        this.saveReport(updatedReport);
        return updatedReport;
      })
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