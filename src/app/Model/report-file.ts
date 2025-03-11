export interface ReportFile {
	id: number;
	name: string;
	description?: string;
	tags?: string[];
	sqlQuery: string;
	filters: any;
	created: Date;
	lastModified: Date;
	size: number;

	// Optional fields
	category?: string;
	status?: FileStatus;
	isArchived?: boolean;
	isPublic?: boolean;
	accessRights?: string[];
}

export enum FileStatus {
	UPLOADING = "uploading",
	PROCESSING = "processing",
	READY = "ready",
	ERROR = "error",
	DELETED = "deleted",
}

export interface FileUploadProgress {
	file: File;
	progress: number;
	error?: string;
	uploaded?: boolean;
	result?: ReportFile;
}
