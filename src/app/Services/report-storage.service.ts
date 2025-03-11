import { HttpClient, HttpEvent, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ReportFile } from "../Model/report-file";
import { Observable } from "rxjs/internal/Observable";
import { catchError, map, of, throwError } from "rxjs";
import { v4 as uuidv4 } from "uuid"; // You may need to install this package

@Injectable({
	providedIn: "root",
})
export class ReportStorageService {
	private apiUrl = "https://localhost:7129/api/Database";
	private currentReportConfig: any = null;
	private localStorageKey = "savedReports";

	constructor(private http: HttpClient) {}

	/**
	 * Get all report files
	 */
	getAllReports(): Observable<ReportFile[]> {
		return this.http.get<ReportFile[]>(`${this.apiUrl}/get-reports`);
	}

	/**
	 * Get a report by id
	 */
	getReport(id: number): Observable<ReportFile> {
		return this.http.get<ReportFile>(`${this.apiUrl}/get-report/${id}`);
	}

	/**
	 * Save a report
	 */
	saveReport(report: ReportFile): Observable<any> {
		return this.http.post(`${this.apiUrl}/save-report`, report);
	}

	/**
	 * Update an existing report
	 */
	updateReport(id: number, report: ReportFile): Observable<any> {
		return this.http.put(`${this.apiUrl}/update-report/${id}`, report);
	}

	/**
	 * Delete a report
	 */
	deleteReport(id: number): Observable<any> {
		return this.http.delete(`${this.apiUrl}/delete-report/${id}`);
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

	getFile(id: number): Observable<ReportFile> {
		return this.getReport(id);
	}

	/**
	 * Upload a file
	 */
	uploadFile(
		file: File,
		metadata?: Partial<ReportFile>
	): Observable<HttpEvent<any>> {
		const formData: FormData = new FormData();
		formData.append("file", file);

		// Add metadata if available
		if (metadata) {
			formData.append("metadata", JSON.stringify(metadata));
		}

		const req = new HttpRequest("POST", this.apiUrl, formData, {
			reportProgress: true,
		});

		return this.http.request(req);
	}

	/**
	 * Delete a file
	 */
	deleteFile(id: number): Observable<any> {
		return this.deleteReport(id);
	}

	/**
	 * Update file metadata
	 */
	updateFileMetadata(
		id: number,
		metadata: Partial<ReportFile>
	): Observable<ReportFile> {
		return this.getReport(id).pipe(
			map((report) => {
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
		return this.http
			.get(url, {
				responseType: "blob",
			})
			.pipe(catchError(this.handleError<Blob>("downloadFile")));
	}

	/**
	 * Handle Http operation that failed.
	 * Let the app continue.
	 */
	private handleError<T>(operation = "operation", result?: T) {
		return (error: any): Observable<T> => {
			console.error(`${operation} failed: ${error.message}`);

			// Let the app keep running by returning an empty result
			return error.status === 404 ? of(result as T) : throwError(() => error);
		};
	}
}
