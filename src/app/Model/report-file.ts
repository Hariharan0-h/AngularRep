export interface ReportFile {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    created: Date;
    lastModified: Date;
    size: number;
    reportConfig: any; // Ideally this would be a proper type definition
    
    // Keeping original fields but making them optional
    originalName?: string;
    type?: string;
    mimeType?: string;
    extension?: string;
    path?: string;
    url?: string;
    thumbnailUrl?: string;
    uploadedAt?: Date;
    uploadedBy?: string;
    category?: string;
    status?: FileStatus;
    metadata?: Record<string, any>;
    isArchived?: boolean;
    isPublic?: boolean;
    accessRights?: string[];
    versionInfo?: {
      version: number;
      previousVersionId?: string;
      changes?: string;
    };
}

export enum FileStatus {
    UPLOADING = 'uploading',
    PROCESSING = 'processing',
    READY = 'ready',
    ERROR = 'error',
    DELETED = 'deleted'
}

export interface FileUploadProgress {
    file: File;
    progress: number;
    error?: string;
    uploaded?: boolean;
    result?: ReportFile;
}