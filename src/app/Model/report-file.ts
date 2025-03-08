export interface ReportFile {
    id: string;
    name: string;
    originalName: string;
    size: number;
    type: string;
    mimeType: string;
    extension: string;
    path: string;
    url?: string;
    thumbnailUrl?: string;
    uploadedAt: Date;
    uploadedBy?: string;
    lastModified?: Date;
    description?: string;
    tags?: string[];
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