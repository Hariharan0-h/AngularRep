// import { Component, OnInit, AfterViewInit } from "@angular/core";
// import { CommonModule } from "@angular/common";
// import { FormsModule } from "@angular/forms";
// import { Router } from "@angular/router";
// import { ReportStorageService } from "../../Services/report-storage.service";
// import { ReportFile } from "../../Model/report-file";

// declare var bootstrap: any;

// @Component({
// 	selector: "app-files",
// 	standalone: true,
// 	imports: [CommonModule, FormsModule],
// 	templateUrl: "./files.component.html",
// 	styleUrls: ["./files.component.css"],
// })
// export class FilesComponent implements OnInit, AfterViewInit {
// 	files: ReportFile[] = [];
// 	filteredFiles: ReportFile[] = [];
// 	selectedFile: ReportFile | null = null;
// 	fileToDelete: ReportFile | null = null;

// 	searchQuery: string = "";
// 	viewMode: "list" | "grid" = "list";
// 	sortOption: string = "dateDesc";

// 	isAddingTag: boolean = false;
// 	isEditingDescription: boolean = false;
// 	newTag: string = "";
// 	descriptionBackup: string = "";

// 	// New report properties
// 	newReportName: string = "";
// 	newReportDescription: string = "";
// 	newReportTag: string = "";
// 	newReportTags: string[] = [];

// 	// Modal references
// 	saveReportModal: any;
// 	deleteConfirmModal: any;

// 	constructor(
// 		private reportStorageService: ReportStorageService,
// 		private router: Router
// 	) {}

// 	ngOnInit(): void {
// 		this.loadFiles();
// 	}

// 	ngAfterViewInit(): void {
// 		// Initialize modals after view is initialized
// 		setTimeout(() => {
// 			this.saveReportModal = new bootstrap.Modal(
// 				document.getElementById("saveReportModal")
// 			);
// 			this.deleteConfirmModal = new bootstrap.Modal(
// 				document.getElementById("deleteConfirmModal")
// 			);
// 		}, 100);
// 	}

// 	loadFiles(): void {
// 		this.reportStorageService
// 			.getAllReports()
// 			.subscribe((files: ReportFile[]) => {
// 				this.files = files;
// 				this.filteredFiles = [...files];
// 				this.sortFiles();
// 			});
// 	}

// 	filterFiles(): void {
// 		if (!this.searchQuery.trim()) {
// 			this.filteredFiles = [...this.files];
// 		} else {
// 			const query = this.searchQuery.toLowerCase().trim();
// 			this.filteredFiles = this.files.filter(
// 				(file) =>
// 					file.name.toLowerCase().includes(query) ||
// 					(file.description &&
// 						file.description.toLowerCase().includes(query)) ||
// 					(file.tags &&
// 						file.tags.some((tag: string) => tag.toLowerCase().includes(query)))
// 			);
// 		}
// 		this.sortFiles();
// 	}

// 	sortFiles(): void {
// 		switch (this.sortOption) {
// 			case "nameAsc":
// 				this.filteredFiles.sort((a, b) => a.name.localeCompare(b.name));
// 				break;
// 			case "nameDesc":
// 				this.filteredFiles.sort((a, b) => b.name.localeCompare(a.name));
// 				break;
// 			case "dateDesc":
// 				this.filteredFiles.sort((a, b) => {
// 					const dateA =
// 						a.lastModified instanceof Date
// 							? a.lastModified.getTime()
// 							: new Date(a.lastModified).getTime();
// 					const dateB =
// 						b.lastModified instanceof Date
// 							? b.lastModified.getTime()
// 							: new Date(b.lastModified).getTime();
// 					return dateB - dateA;
// 				});
// 				break;
// 			case "dateAsc":
// 				this.filteredFiles.sort((a, b) => {
// 					const dateA =
// 						a.lastModified instanceof Date
// 							? a.lastModified.getTime()
// 							: new Date(a.lastModified).getTime();
// 					const dateB =
// 						b.lastModified instanceof Date
// 							? b.lastModified.getTime()
// 							: new Date(b.lastModified).getTime();
// 					return dateA - dateB;
// 				});
// 				break;
// 		}
// 	}

// 	selectFile(file: ReportFile): void {
// 		this.selectedFile = file;
// 		this.isEditingDescription = false;
// 		this.isAddingTag = false;
// 	}

// 	formatSize(bytes: number): string {
// 		if (bytes === 0) return "0 Bytes";
// 		const k = 1024;
// 		const sizes = ["Bytes", "KB", "MB", "GB"];
// 		const i = Math.floor(Math.log(bytes) / Math.log(k));
// 		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
// 	}

// 	addTag(): void {
// 		if (this.newTag.trim() && this.selectedFile) {
// 			if (!this.selectedFile.tags) {
// 				this.selectedFile.tags = [];
// 			}
// 			if (!this.selectedFile.tags.includes(this.newTag.trim())) {
// 				this.selectedFile.tags.push(this.newTag.trim());
// 				this.saveFile(this.selectedFile);
// 			}
// 			this.newTag = "";
// 			this.isAddingTag = false;
// 		}
// 	}

// 	saveDescription(): void {
// 		if (this.selectedFile) {
// 			this.saveFile(this.selectedFile);
// 			this.isEditingDescription = false;
// 		}
// 	}

// 	cancelEditDescription(): void {
// 		if (this.selectedFile) {
// 			this.selectedFile.description = this.descriptionBackup;
// 			this.isEditingDescription = false;
// 		}
// 	}

// 	startEditDescription(): void {
// 		if (this.selectedFile) {
// 			this.descriptionBackup = this.selectedFile.description || "";
// 			this.isEditingDescription = true;
// 		}
// 	}

// 	loadReport(file: ReportFile): void {
// 		// this.reportStorageService.setCurrentReportConfig(file.reportConfig);
// 		this.router.navigate(["/reports"]);
// 	}

// 	duplicateReport(file: ReportFile): void {
// 		const duplicate: ReportFile = {
// 			...JSON.parse(JSON.stringify(file)),
// 			id: this.reportStorageService.generateUniqueId(),
// 			name: `${file.name} (Copy)`,
// 			created: new Date(),
// 			lastModified: new Date(),
// 		};

// 		this.reportStorageService.saveReport(duplicate).subscribe(() => {
// 			this.loadFiles();
// 			this.selectFile(duplicate);
// 		});
// 	}

// 	confirmDelete(file: ReportFile): void {
// 		this.fileToDelete = file;
// 		if (this.deleteConfirmModal) {
// 			this.deleteConfirmModal.show();
// 		} else {
// 			console.error("Delete confirmation modal not initialized");
// 		}
// 	}

// 	deleteFile(): void {
// 		if (this.fileToDelete) {
// 			this.reportStorageService
// 				.deleteReport(Number(this.fileToDelete.id))
// 				.subscribe(() => {
// 					if (
// 						this.selectedFile &&
// 						this.selectedFile.id === this.fileToDelete?.id
// 					) {
// 						this.selectedFile = null;
// 					}
// 					this.loadFiles();
// 					if (this.deleteConfirmModal) {
// 						this.deleteConfirmModal.hide();
// 					}
// 				});
// 		}
// 	}

// 	openSaveReportModal(): void {
// 		this.newReportName = "";
// 		this.newReportDescription = "";
// 		this.newReportTags = [];
// 		this.newReportTag = "";
// 		if (this.saveReportModal) {
// 			this.saveReportModal.show();
// 		} else {
// 			console.error("Save report modal not initialized");
// 		}
// 	}

// 	addReportTag(): void {
// 		if (
// 			this.newReportTag.trim() &&
// 			!this.newReportTags.includes(this.newReportTag.trim())
// 		) {
// 			this.newReportTags.push(this.newReportTag.trim());
// 			this.newReportTag = "";
// 		}
// 	}

// 	removeReportTag(index: number): void {
// 		this.newReportTags.splice(index, 1);
// 	}

// 	saveNewReport(): void {
// 		if (!this.newReportName.trim()) {
// 			alert("Please provide a name for your report");
// 			return;
// 		}

// 		const currentConfig = this.reportStorageService.getCurrentReportConfig();
// 		if (!currentConfig) {
// 			alert("No active report configuration to save");
// 			return;
// 		}

// 		const newReport: ReportFile = {
// 			id: 0,
// 			name: this.newReportName.trim(),
// 			description: this.newReportDescription.trim(),
// 			tags: [...this.newReportTags],
// 			size: JSON.stringify(currentConfig).length,
// 			created: new Date(),
// 			lastModified: new Date(),
// 			// reportConfig: currentConfig,
// 		};

// 		this.reportStorageService.saveReport(newReport).subscribe(() => {
// 			this.loadFiles();
// 			if (this.saveReportModal) {
// 				this.saveReportModal.hide();
// 			}
// 			this.selectFile(newReport);
// 		});
// 	}

// 	saveFile(file: ReportFile): void {
// 		file.lastModified = new Date();
// 		this.reportStorageService.saveReport(file).subscribe(() => {
// 			this.loadFiles();
// 		});
// 	}
// }
