import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as bootstrap from 'bootstrap';
import 'jspdf-autotable';
import { forkJoin, map, Observable } from 'rxjs';
import { ReportStorageService } from '../../Services/report-storage.service';
import { ReportFile } from '../../Model/report-file';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  tables: string[] = [];
  views: string[] = [];
  selectedTables: string[] = [];
  tableSchemas: { [tableName: string]: any[] } = {};
  selectedAttributes: any[] = [];
  availableAttributes: any[] = [];
  reportData: any[] = [];
  filterOptions: any[] = [];
  activeFilters: any[] = [];
  groupByOptions: string[] = [];
  selectedGroupBy: string = '';
  isLoading: boolean = false;
  baseUrl: string = 'https://localhost:7129/api/Database';
  sqlQuery: string = '';
  sqlIsValid: boolean = false;
  sqlValidationMessage: string = '';
  newReportName: string = '';
  newReportDescription: string = '';
  newReportTag: string = '';
  newReportTags: string[] = [];
  saveReportModal: any;
  
  // Flag to prevent recursive updates between UI and SQL
  private updatingFromSql: boolean = false;
  private updatingFromUI: boolean = false;
  
  // To track which table's filters and group by are being displayed
  currentDisplayTable: string = '';

  constructor(
    private reportStorageService: ReportStorageService,
    private router: Router,
    private http: HttpClient) { }

  ngOnInit(): void {
    this.loadTables();
    this.loadViews();
    this.initTabs();
  }

  ngAfterViewInit(): void {
    // Initialize the save report modal
    const modalElement = document.getElementById('saveReportModal');
    if (modalElement) {
      new bootstrap.Modal(modalElement);
    }
  }

  addReportTag(): void {
    if (this.newReportTag.trim() && !this.newReportTags.includes(this.newReportTag.trim())) {
      this.newReportTags.push(this.newReportTag.trim());
      this.newReportTag = '';
    }
  }
  
  removeReportTag(index: number): void {
    this.newReportTags.splice(index, 1);
  }
  
  saveCurrentReport(): void {
    if (!this.newReportName.trim()) {
      alert('Please enter a report name');
      return;
    }
    
    // Prepare report configuration
    const reportConfig = {
      selectedTables: this.selectedTables,
      selectedAttributes: this.selectedAttributes,
      availableAttributes: this.availableAttributes,
      activeFilters: this.activeFilters,
      selectedGroupBy: this.selectedGroupBy,
      sqlQuery: this.sqlQuery,
      reportData: this.reportData
    };
    
    // Create a new report file
    const reportFile: ReportFile = {
      id: this.reportStorageService.generateUniqueId(),
      name: this.newReportName.trim(),
      description: this.newReportDescription,
      tags: this.newReportTags,
      created: new Date(),
      lastModified: new Date(),
      size: JSON.stringify(reportConfig).length, // Estimate size
      reportConfig: reportConfig
    };
    
    // Save the report using the service
    this.reportStorageService.saveReport(reportFile).subscribe({
      next: (saved) => {
        console.log('Report saved successfully', saved);
        this.saveReportModal.hide();
        
        // Optional: Navigate to files component to show saved reports
        // this.router.navigate(['/files']);
        
        // Show success message
        alert('Report saved successfully!');
      },
      error: (error) => {
        console.error('Error saving report', error);
        alert('Error saving report. Please try again.');
      }
    });
  }

  openSaveReportModal(): void {
    // Reset form fields
    this.newReportName = '';
    this.newReportDescription = '';
    this.newReportTag = '';
    this.newReportTags = [];
    
    // Open the modal
    this.saveReportModal.show();
  }

  // Method to initialize tabs (call this in ngOnInit)
  initTabs() {
    const tabLinks = document.querySelectorAll('.nav-link');
    
    tabLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        
        // Remove active class from all tabs and tab contents
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(el => {
          el.classList.remove('show');
          el.classList.remove('active');
        });
        
        // Add active class to clicked tab
        link.classList.add('active');
        
        // Get the target tab content id
        const targetId = link.getAttribute('href');
        if (targetId) {
          // Show the target tab content
          const targetPane = document.querySelector(targetId);
          if (targetPane) {
            targetPane.classList.add('show');
            targetPane.classList.add('active');
          }
        }
      });
    });
  }

  loadSavedReportConfig(config: any): void {
    if (!config) return;
    
    // Set selected tables and load schemas
    this.selectedTables = config.selectedTables || [];
    this.selectedTables.forEach(table => {
      if (!this.tableSchemas[table]) {
        this.loadTableSchema(table);
      }
    });
    
    // Set current display table
    if (this.selectedTables.length > 0) {
      this.setCurrentDisplayTable(this.selectedTables[0]);
    }
    
    // Restore selected attributes
    this.selectedAttributes = config.selectedAttributes || [];
    
    // Restore filters
    this.activeFilters = config.activeFilters || [];
    
    // Restore group by
    this.selectedGroupBy = config.selectedGroupBy || '';
    
    // Restore SQL query
    this.sqlQuery = config.sqlQuery || '';
    
    // Restore report data if available
    if (config.reportData && config.reportData.length > 0) {
      this.reportData = config.reportData;
    }
  }

  // Add a method to generate SQL from UI selections
  generateSqlFromSelections() {
    if (this.updatingFromSql || this.selectedTables.length === 0 || this.selectedAttributes.length === 0) {
      return;
    }
    
    this.updatingFromUI = true;
    
    try {
      // Start building the SELECT part
      let selectPart = 'SELECT ';
      
      // Add selected attributes
      const columnParts = this.selectedAttributes.map(attr => {
        const {table, column} = attr;
        return `${table}.${column}`;
      });
      
      selectPart += columnParts.join(', ');
      
      // Add FROM part with tables
      let fromPart = ' FROM ' + this.selectedTables.join(', ');
      
      // Add WHERE part for filters
      let wherePart = '';
      if (this.activeFilters.length > 0) {
        wherePart = ' WHERE ';
        const filterParts = this.activeFilters.map(filter => {
          if (!filter.field || !filter.value) return null;
          
          const fieldParts = filter.field.split('.');
          const field = fieldParts.length === 2 ? filter.field : `${this.currentDisplayTable}.${filter.field}`;
          
          switch (filter.operator) {
            case 'equals':
              return `${field} = '${filter.value}'`;
            case 'contains':
              return `${field} LIKE '%${filter.value}%'`;
            case 'greaterThan':
              return `${field} > ${filter.value}`;
            case 'lessThan':
              return `${field} < ${filter.value}`;
            default:
              return null;
          }
        }).filter(part => part !== null);
        
        if (filterParts.length > 0) {
          wherePart += filterParts.join(' AND ');
        } else {
          wherePart = '';
        }
      }
      
      // Add GROUP BY part
      let groupByPart = '';
      if (this.selectedGroupBy) {
        groupByPart = ` GROUP BY ${this.selectedGroupBy}`;
      }
      
      // Combine all parts to form the complete SQL query
      this.sqlQuery = selectPart + fromPart + wherePart + groupByPart;
      
      // Validate the generated SQL query
      this.validateSqlQuery();
    } finally {
      this.updatingFromUI = false;
    }
  }

  // Update the validateSqlQuery method to parse SQL and update UI components
  validateSqlQuery() {
    if (!this.sqlQuery || this.sqlQuery.trim() === '') {
      this.sqlIsValid = false;
      this.sqlValidationMessage = 'Please enter a SQL query';
      return;
    }
  
    // Basic validation - check for SELECT keyword
    if (!this.sqlQuery.toUpperCase().includes('SELECT')) {
      this.sqlIsValid = false;
      this.sqlValidationMessage = 'Query must contain a SELECT statement';
      return;
    }
  
    // More comprehensive validation
    try {
      // Parse the query to extract tables, columns, filters, etc.
      if (!this.updatingFromUI) {
        this.parseSqlQuery();
      }
      
      this.sqlIsValid = true;
      this.sqlValidationMessage = 'SQL query is valid';
    } catch (e) {
      this.sqlIsValid = false;
      this.sqlValidationMessage = `Invalid SQL: ${(e as Error).message}`;
    }
  }

  // Add a method to parse SQL query and update UI selections
  parseSqlQuery() {
    if (this.updatingFromUI) return;
    
    this.updatingFromSql = true;
    
    try {
      const sql = this.sqlQuery.trim().toUpperCase();
      
      // Extract tables
      const fromMatch = sql.match(/FROM\s+([^WHERE|GROUP BY|ORDER BY|HAVING|LIMIT]+)/i);
      if (fromMatch && fromMatch[1]) {
        const tablesStr = fromMatch[1].trim();
        const tablesList = tablesStr.split(',').map(t => t.trim());
        
        // Clear previously selected tables
        this.selectedTables = [];
        
        // Add newly selected tables and load their schemas
        tablesList.forEach(tableName => {
          // Remove aliases if present
          const parts = tableName.split(/\s+AS\s+|\s+/i);
          const table = parts[0].trim();
          
          if (!this.selectedTables.includes(table)) {
            this.selectedTables.push(table);
            
            // Load table schema if not already loaded
            if (!this.tableSchemas[table]) {
              this.loadTableSchema(table);
            }
          }
        });
        
        // Set current display table to the first table
        if (this.selectedTables.length > 0 && 
            (!this.currentDisplayTable || !this.selectedTables.includes(this.currentDisplayTable))) {
          this.setCurrentDisplayTable(this.selectedTables[0]);
        }
      }
      
      // Extract selected columns
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
      if (selectMatch && selectMatch[1]) {
        const columnsStr = selectMatch[1].trim();
        
        // Handle SELECT * case
        if (columnsStr === '*') {
          // Will be handled after tables are loaded
        } else {
          // Clear previously selected attributes
          this.selectedAttributes = [];
          
          // Parse individual columns, handling functions and aliases
          const columnsList = this.parseColumnList(columnsStr);
          
          // Update selected attributes based on parsed columns
          // This will happen asynchronously after table schemas are loaded
          // so we'll set up a timeout to do this after schemas are likely loaded
          setTimeout(() => {
            this.updateSelectedAttributesFromParsedColumns(columnsList);
          }, 1000);
        }
      }
      
      // Extract WHERE clause for filters
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP BY|\s+ORDER BY|\s+HAVING|\s+LIMIT|$)/i);
      if (whereMatch && whereMatch[1]) {
        const whereStr = whereMatch[1].trim();
        
        // Clear previously active filters
        this.activeFilters = [];
        
        // Parse filters (this is simplified and won't handle all SQL WHERE cases)
        const conditions = whereStr.split(/\s+AND\s+/i);
        conditions.forEach(condition => {
          // Try to parse basic conditions like "table.column = 'value'"
          const opMatch = condition.match(/(.+?)\s*(=|LIKE|>|<)\s*(.+)/i);
          if (opMatch) {
            const field = opMatch[1].trim();
            const operator = opMatch[2].trim().toUpperCase();
            let value = opMatch[3].trim();
            
            // Remove quotes from string values
            if (value.startsWith("'") && value.endsWith("'")) {
              value = value.substring(1, value.length - 1);
            }
            
            // Map SQL operators to our filter operators
            let filterOp;
            switch (operator) {
              case '=': filterOp = 'equals'; break;
              case 'LIKE': filterOp = 'contains'; break;
              case '>': filterOp = 'greaterThan'; break;
              case '<': filterOp = 'lessThan'; break;
              default: filterOp = 'equals';
            }
            
            // Add to active filters
            this.activeFilters.push({
              field: field,
              operator: filterOp,
              value: value.replace(/%/g, '') // Remove % from LIKE patterns
            });
          }
        });
      }
      
      // Extract GROUP BY clause
      const groupByMatch = sql.match(/GROUP BY\s+(.+?)(?:\s+ORDER BY|\s+HAVING|\s+LIMIT|$)/i);
      if (groupByMatch && groupByMatch[1]) {
        this.selectedGroupBy = groupByMatch[1].trim();
      } else {
        this.selectedGroupBy = '';
      }
    } finally {
      this.updatingFromSql = false;
    }
  }

  // Helper method to parse column list from SQL SELECT clause
  parseColumnList(columnsStr: string): any[] {
    const columns: any[] = [];
    
    // Split by commas, but respect parentheses (for functions)
    let current = '';
    let parenLevel = 0;
    
    for (let i = 0; i < columnsStr.length; i++) {
      const char = columnsStr[i];
      
      if (char === '(') {
        parenLevel++;
        current += char;
      } else if (char === ')') {
        parenLevel--;
        current += char;
      } else if (char === ',' && parenLevel === 0) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last column
    if (current.trim()) {
      columns.push(current.trim());
    }
    
    // Process each column to extract table, column name, and alias
    return columns.map(col => {
      const parts = col.split(/\s+AS\s+|\s+/i);
      
      let column, alias;
      if (parts.length > 1) {
        column = parts[0].trim();
        alias = parts[parts.length - 1].trim();
      } else {
        column = parts[0].trim();
        alias = column;
      }
      
      // Check if column contains table name (e.g., "table.column")
      const tableParts = column.split('.');
      if (tableParts.length > 1) {
        return {
          fullExpression: col,
          table: tableParts[0],
          column: tableParts[1],
          alias: alias
        };
      } else {
        return {
          fullExpression: col,
          table: '',  // Will be filled later based on schema matching
          column: column,
          alias: alias
        };
      }
    });
  }

  // Helper method to update selected attributes based on parsed columns
  updateSelectedAttributesFromParsedColumns(parsedColumns: any[]) {
    // Reset selected attributes
    this.selectedAttributes = [];
    
    parsedColumns.forEach(parsed => {
      // If table is not specified in the column, try to determine from available tables
      if (!parsed.table && this.selectedTables.length > 0) {
        // Try to find matching column in any of the selected tables
        for (const table of this.selectedTables) {
          if (this.tableSchemas[table]) {
            const matchingColumn = this.tableSchemas[table].find(
              col => col.name.toUpperCase() === parsed.column.toUpperCase()
            );
            
            if (matchingColumn) {
              parsed.table = table;
              break;
            }
          }
        }
        
        // If still no match, assign to first table
        if (!parsed.table && this.selectedTables.length > 0) {
          parsed.table = this.selectedTables[0];
        }
      }
      
      if (parsed.table) {
        // Add to selected attributes
        this.selectedAttributes.push({
          table: parsed.table,
          column: parsed.column,
          type: this.guessColumnType(parsed.column),
          displayName: parsed.alias || `${parsed.table}.${parsed.column}`
        });
      }
    });
    
    // Update available attributes
    this.updateAvailableAttributes();
    
    // Generate report with new selections
    this.generateReport();
  }

  executeSqlQuery() {
    if (!this.sqlIsValid) {
      return;
    }
  
    // Show loading indicator
    this.isLoading = true;
    
    // Clear existing report data
    this.reportData = [];
  
    // In a real application, you would send the query to your backend service
    // Here we'll simulate the process with a timeout
    setTimeout(() => {
      // Parse the query to determine the columns (very simplified approach)
      const columnsMatch = this.sqlQuery.match(/SELECT\s+(.*?)\s+FROM/i);
      let columns: string[] = [];
      
      if (columnsMatch && columnsMatch[1]) {
        // Handle 'SELECT *' case
        if (columnsMatch[1].trim() === '*') {
          // Use all attributes from currently selected tables
          if (this.currentDisplayTable && this.tableSchemas[this.currentDisplayTable]) {
            columns = this.tableSchemas[this.currentDisplayTable].map(col => col.name);
          }
        } else {
          // Parse individual columns
          const parsedColumns = this.parseColumnList(columnsMatch[1]);
          columns = parsedColumns.map(col => col.alias || col.column);
        }
      }
  
      // Generate sample data based on the query
      // This is just for demonstration - real implementation would execute the query on the server
      this.generateSampleData(columns);
      
      // Update selected attributes to match the query results if not already done
      if (this.updatingFromSql) {
        this.updateSelectedAttributesFromSql(columns);
      }
      
      this.isLoading = false;
    }, 1500); // Simulate network delay
  }

  private generateSampleData(columns: string[]) {
    const sampleCount = Math.floor(Math.random() * 10) + 5; // 5-15 rows
    
    for (let i = 0; i < sampleCount; i++) {
      const row: { [key: string]: any } = {};
      
      columns.forEach(column => {
        // Generate different types of sample data based on column name hints
        if (column.toLowerCase().includes('id')) {
          row[column] = i + 1;
        } else if (column.toLowerCase().includes('name')) {
          row[column] = `Name ${i + 1}`;
        } else if (column.toLowerCase().includes('date')) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          row[column] = date.toISOString().split('T')[0];
        } else if (column.toLowerCase().includes('amount') || 
                   column.toLowerCase().includes('price') || 
                   column.toLowerCase().includes('cost')) {
          row[column] = (Math.random() * 1000).toFixed(2);
        } else if (column.toLowerCase().includes('count') || 
                   column.toLowerCase().includes('quantity')) {
          row[column] = Math.floor(Math.random() * 100);
        } else {
          row[column] = `Value ${i + 1} for ${column}`;
        }
      });
      
      this.reportData.push(row);
    }
  }

  private updateSelectedAttributesFromSql(columns: string[]) {
    this.selectedAttributes = columns.map(columnName => {
      return {
        table: this.currentDisplayTable || 'Custom SQL',
        column: columnName,
        type: this.guessColumnType(columnName),
        displayName: columnName
      };
    });
  }  

  private guessColumnType(columnName: string): string {
    const name = columnName.toLowerCase();
    if (name.includes('id')) return 'INTEGER';
    if (name.includes('date')) return 'DATE';
    if (name.includes('price') || name.includes('amount') || name.includes('cost')) return 'DECIMAL';
    if (name.includes('count') || name.includes('quantity')) return 'INTEGER';
    return 'VARCHAR';
  }

  loadTables() {
    this.isLoading = true;
    this.http.get<string[]>(`${this.baseUrl}/tables`).subscribe(
      (data) => {
        this.tables = data;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error loading tables', error);
        this.isLoading = false;
      }
    );
  }

  loadViews() {
    this.isLoading = true;
    this.http.get<string[]>(`${this.baseUrl}/views`).subscribe(
      (data) => {
        this.views = data;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error loading views', error);
        this.isLoading = false;
      }
    );
  }

  onTableSelect(tableName: string) {
    if (!this.selectedTables.includes(tableName)) {
      this.selectedTables.push(tableName);
      this.loadTableSchema(tableName);
      
      // Set as current display table if it's the first table added
      if (this.selectedTables.length === 1) {
        this.setCurrentDisplayTable(tableName);
      }
      
      // Generate SQL query based on the new selection
      this.generateSqlFromSelections();
    }
  }

  setCurrentDisplayTable(tableName: string) {
    this.currentDisplayTable = tableName;
    // Update filter options and group by options for the current table
    this.updateFilterOptionsForTable(tableName);
    this.updateGroupByOptionsForTable(tableName);
  }

  // Fix the loadTableSchema method to properly handle SQL attribute types
  loadTableSchema(tableName: string) {
    this.isLoading = true;
    this.http.get<any[]>(`${this.baseUrl}/schema/${tableName}`).subscribe(
      (schema) => {
        console.log('Schema for table:', tableName, schema);
        
        // Normalize the schema data with improved type handling
        const normalizedSchema = schema.map(column => {
          // Extract the SQL type and convert to friendly type name
          let friendlyType = this.getSqlFriendlyType(column.type || column.data_type || '');
          
          return {
            name: column.name || column.column_name || '',
            type: friendlyType,
            originalType: column.type || column.data_type || '',
            nullable: column.is_nullable === 'YES' || column.nullable === true,
            // Other properties as needed
          };
        });
        
        this.tableSchemas[tableName] = normalizedSchema;
        this.updateAvailableAttributes();
        
        if (this.currentDisplayTable === tableName || !this.currentDisplayTable) {
          this.updateFilterOptionsForTable(tableName);
          this.updateGroupByOptionsForTable(tableName);
        }
        
        this.isLoading = false;
      },
      (error) => {
        console.error(`Error loading schema for ${tableName}`, error);
        this.isLoading = false;
      }
    );
  }

  updateAvailableAttributes() {
    this.availableAttributes = [];
    Object.keys(this.tableSchemas).forEach(tableName => {
      this.tableSchemas[tableName].forEach(column => {
        const attributeExists = this.selectedAttributes.some(
          attr => attr.table === tableName && attr.column === column.name
        );
        
        if (!attributeExists) {
          this.availableAttributes.push({
            table: tableName,
            column: column.name,
            type: column.type,
            displayName: `${tableName}.${column.name}`
          });
        }
      });
    });
  }

  updateFilterOptionsForTable(tableName: string) {
    if (!tableName || !this.tableSchemas[tableName]) return;
    
    this.filterOptions = [];
    this.tableSchemas[tableName].forEach(column => {
      this.filterOptions.push({
        table: tableName,
        column: column.name,
        type: column.type,
        displayName: `${tableName}.${column.name}`
      });
    });
    
    // Clear existing filters as they might not be compatible with the new table
    this.activeFilters = [];
  }

  updateGroupByOptionsForTable(tableName: string) {
    if (!tableName || !this.tableSchemas[tableName]) return;
    
    this.groupByOptions = [];
    this.tableSchemas[tableName].forEach(column => {
      this.groupByOptions.push(`${tableName}.${column.name}`);
    });
    
    // Reset the selected group by as it might not be compatible with the new table
    this.selectedGroupBy = '';
  }

  selectAttribute(attribute: any) {
    const exists = this.selectedAttributes.some(
      attr => attr.table === attribute.table && attr.column === attribute.column
    );
    
    if (!exists) {
      this.selectedAttributes.push(attribute);
      // Remove from available attributes
      this.availableAttributes = this.availableAttributes.filter(
        attr => !(attr.table === attribute.table && attr.column === attribute.column)
      );
      
      // Update SQL query based on the new selection
      this.generateSqlFromSelections();
      
      this.generateReport();
    }
  }

  removeAttribute(index: number) {
    // Add back to available attributes
    const attribute = this.selectedAttributes[index];
    this.availableAttributes.push(attribute);
    
    // Remove from selected attributes
    this.selectedAttributes.splice(index, 1);
    
    // Update SQL query to reflect removed attribute
    this.generateSqlFromSelections();
    
    this.generateReport();
  }

  // New method to select all available attributes
  selectAllAttributes() {
    const newAttributes = this.availableAttributes.filter(attr => {
      return !this.selectedAttributes.some(
        selected => selected.table === attr.table && selected.column === attr.column
      );
    });
    
    this.selectedAttributes = [...this.selectedAttributes, ...newAttributes];
    this.availableAttributes = [];
    
    // Update SQL query based on selecting all attributes
    this.generateSqlFromSelections();
    
    this.generateReport();
  }

  // New method to remove all selected attributes
  removeAllAttributes() {
    this.availableAttributes = [...this.availableAttributes, ...this.selectedAttributes];
    this.selectedAttributes = [];
    this.reportData = [];
    
    // Update SQL query to reflect that no attributes are selected
    this.generateSqlFromSelections();
  }

  removeTable(tableName: string) {
    this.selectedTables = this.selectedTables.filter(t => t !== tableName);
    delete this.tableSchemas[tableName];
    
    // Remove attributes from selected and available lists
    this.selectedAttributes = this.selectedAttributes.filter(attr => attr.table !== tableName);
    this.availableAttributes = this.availableAttributes.filter(attr => attr.table !== tableName);
    
    // If the removed table was the current display table, update to a new one
    if (this.currentDisplayTable === tableName) {
      if (this.selectedTables.length > 0) {
        this.setCurrentDisplayTable(this.selectedTables[0]);
      } else {
        this.currentDisplayTable = '';
        this.filterOptions = [];
        this.groupByOptions = [];
        this.activeFilters = [];
        this.selectedGroupBy = '';
      }
    }
    
    // Update SQL query to reflect removed table
    this.generateSqlFromSelections();
    
    this.generateReport();
  }

  addFilter() {
    if (this.filterOptions.length > 0) {
      this.activeFilters.push({
        field: this.filterOptions[0].displayName,
        operator: 'equals',
        value: ''
      });
      
      // Don't generate SQL yet as the filter is incomplete without a value
    }
  }

  removeFilter(index: number) {
    this.activeFilters.splice(index, 1);
    
    // Update SQL query to reflect removed filter
    this.generateSqlFromSelections();
    
    this.generateReport();
  }

  applyFilters() {
    // Update SQL query to reflect the applied filters
    this.generateSqlFromSelections();
    
    this.generateReport();
  }

  setGroupBy(field: string) {
    this.selectedGroupBy = field;
    
    // Update SQL query to reflect the group by change
    this.generateSqlFromSelections();
    
    this.generateReport();
  }

  generateReport() {
    if (this.selectedAttributes.length === 0) {
      this.reportData = [];
      return;
    }
  
    this.isLoading = true;
  
    if (this.selectedTables.length > 0) {
      // If multiple tables are selected, use joins
      if (this.selectedTables.length > 1) {
        const requestData = {
          tables: this.selectedTables,
          columns: this.selectedAttributes.map(attr => ({ 
            table: attr.table, 
            column: attr.column 
          })),
          filters: this.activeFilters,
          groupBy: this.selectedGroupBy ? {
            table: this.selectedGroupBy.split('.')[0],
            column: this.selectedGroupBy.split('.')[1]
          } : null
        };
  
        this.http.post<any[]>(`${this.baseUrl}/query`, requestData).subscribe(
          (data) => {
            console.log('Raw joined data received:', data);
            // Process the joined data
            this.processReportData(data, true);
            this.isLoading = false;
          },
          (error) => {
            console.error('Error generating report with joins', error);
            this.isLoading = false;
          }
        );
      } else {
        // Single table query - use query params approach for better flexibility
        const primaryTable = this.selectedTables[0];
        
        // Prepare query parameters
        let queryParams = new HttpParams()
          .set('tables', primaryTable)
          .set('attributes', this.selectedAttributes
            .filter(attr => attr.table === primaryTable)
            .map(attr => attr.column)
            .join(','))
          .set('filters', this.serializeFilters())
          .set('groupBy', this.selectedGroupBy || '');

        // Ensure filters are added
        if (this.activeFilters.length > 0) {
          queryParams = queryParams.set('filters', JSON.stringify(this.activeFilters));
        }
  
        // Use GET with query params for single table
        this.http.get<any[]>(`${this.baseUrl}/data/${primaryTable}`, { params: queryParams }).subscribe(
          (data) => {
            console.log('Raw data received:', data);
            let filteredData = [...data];
  
            // Apply client-side filtering if needed
            if (this.activeFilters.length > 0) {
              filteredData = this.applyClientSideFilters(filteredData);
            }
  
            // Process the filtered data
            this.processReportData(filteredData, false);
            this.isLoading = false;
          },
          (error) => {
            console.error(`Error generating report for ${primaryTable}`, error);
            this.isLoading = false;
          }
        );
      }
    } else {
      // No tables selected
      this.reportData = [];
      this.isLoading = false;
    }
  }
  
  applyClientSideFilters(data: any[]): any[] {
    return data.filter(item => {
      return this.activeFilters.every(filter => {
        if (!filter.field || !filter.value) return true;
        
        const [tableName, columnName] = filter.field.split('.');
        
        // Handle null or undefined values
        if (item[columnName] === null || item[columnName] === undefined) {
          return filter.operator === 'equals' && (filter.value === 'null' || filter.value === '');
        }
        
        const itemValue = String(item[columnName]).toLowerCase();
        const filterValue = String(filter.value).toLowerCase();
        
        switch (filter.operator) {
          case 'equals':
            return itemValue === filterValue;
          case 'contains':
            return itemValue.includes(filterValue);
          case 'greaterThan':
            return Number(item[columnName]) > Number(filter.value);
          case 'lessThan':
            return Number(item[columnName]) < Number(filter.value);
          default:
            return true;
        }
      });
    });
  }

  executeQuery(queryParams: any): Observable<any[]> {
    let params = new HttpParams();
    
    // Add parameters to request
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key]) {
        params = params.set(key, queryParams[key]);
      }
  });

  // Use a single endpoint that handles joins and complex queries
  return this.http.get<any[]>(`${this.baseUrl}/query`, { params });
}

serializeFilters(): string {
  if (!this.activeFilters || this.activeFilters.length === 0) {
    return '';
  }
  
  return this.activeFilters
    .filter(filter => filter.field && filter.operator && filter.value !== '')
    .map(filter => `${filter.field}|${filter.operator}|${filter.value}`)
    .join(';');
}

// Helper method to process report data with or without grouping
processReportData(data: any[], isJoinedData: boolean) {
  if (!data || data.length === 0) {
    this.reportData = [];
    return;
  }

  // Apply grouping if selected
  if (this.selectedGroupBy && this.selectedGroupBy !== '') {
    const [tableName, columnName] = this.selectedGroupBy.split('.');
    
    // Group the data
    const groupedData: { [key: string]: any[] } = {};
    
    data.forEach(item => {
      // Handle property access based on whether data is joined
      const groupValue = isJoinedData ? 
        (item[tableName]?.[columnName] !== null && item[tableName]?.[columnName] !== undefined ? 
          String(item[tableName][columnName]) : 'null') :
        (item[columnName] !== null && item[columnName] !== undefined ? 
          String(item[columnName]) : 'null');
          
      if (!groupedData[groupValue]) {
        groupedData[groupValue] = [];
      }
      groupedData[groupValue].push(item);
    });

    // Transform the grouped data for display
    this.reportData = Object.keys(groupedData).map(key => {
      const result: any = {};
      const items = groupedData[key];
      
      // For each selected attribute, apply aggregation
      this.selectedAttributes.forEach(attr => {
        const attrTable = attr.table;
        const attrColumn = attr.column;
        
        // For the grouping column, use the group key
        if (attrTable === tableName && attrColumn === columnName) {
          result[attr.displayName] = key === 'null' ? null : key;
        } else {
          // Extract values based on data structure
          const values = items.map(item => {
            if (isJoinedData) {
              return item[attrTable]?.[attrColumn];
            } else {
              return item[attrColumn];
            }
          }).filter(v => v !== null && v !== undefined);
          
          // Apply appropriate aggregation
          result[attr.displayName] = this.aggregateValues(values, attrColumn);
        }
      });
      
      return result;
    });
  } else {
    // No grouping - create transformed data based on selected attributes
    this.reportData = data.map(item => {
      const result: any = {};
      
      this.selectedAttributes.forEach(attr => {
        const attrTable = attr.table;
        const attrColumn = attr.column;
        
        if (isJoinedData) {
          // For joined data, access nested properties
          result[attr.displayName] = item[attrTable]?.[attrColumn] !== undefined ? 
            item[attrTable][attrColumn] : 'N/A';
        } else {
          // For single table data, direct property access
          result[attr.displayName] = item[attrColumn] !== undefined ? 
            item[attrColumn] : 'N/A';
        }
      });
      
      return result;
    });
  }
  
  console.log('Processed report data:', this.reportData);
}

aggregateValues(values: any[], columnName: string): any {
  if (!values || values.length === 0) return 'N/A';
  
  // Determine if values are numeric
  const isNumeric = this.isNumericArray(values);
  
  if (isNumeric) {
    // For numeric values, apply sum aggregation
    const numericValues = values.map(v => Number(v));
    return this.calculateAggregate(numericValues, 'sum');
  } else if (values.length > 0) {
    // For non-numeric values, provide meaningful representation
    const uniqueValues = [...new Set(values)];
    
    if (uniqueValues.length === 1) {
      // If all values are the same, use that value
      return uniqueValues[0];
    } else if (uniqueValues.length <= 3) {
      // If there are few unique values, show them all
      return uniqueValues.join(', ');
    } else {
      // Otherwise, show count of unique values
      return `${uniqueValues.length} unique values`;
    }
  } else {
    return 'N/A';
  }
}

// Helper method to check if an array contains only numeric values
private isNumericArray(values: any[]): boolean {
    return values.every(value => !isNaN(Number(value)));
}

// Helper method to calculate aggregate values
private calculateAggregate(values: number[], type: string): number {
    switch (type) {
        case 'sum':
            return values.reduce((sum, value) => sum + value, 0);
        case 'avg':
            return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
        case 'min':
            return values.length > 0 ? Math.min(...values) : 0;
        case 'max':
            return values.length > 0 ? Math.max(...values) : 0;
        default:
            return 0;
    }
}

getSqlFriendlyType(sqlType: string): string {
  // Extract base type from SQL type definition (remove size, precision, etc.)
  const baseType = sqlType.split('(')[0].toLowerCase();
  
  // Map SQL types to friendly names
  switch (baseType) {
    case 'int':
    case 'bigint':
    case 'smallint':
    case 'tinyint':
    case 'decimal':
    case 'numeric':
    case 'float':
    case 'money':
      return 'Number';
      
    case 'varchar':
    case 'nvarchar':
    case 'char':
    case 'nchar':
    case 'text':
    case 'ntext':
      return 'Text';
      
    case 'date':
    case 'datetime':
    case 'datetime2':
    case 'smalldatetime':
      return 'Date';
      
    case 'bit':
      return 'Boolean';
      
    default:
      return sqlType; // If no match, return the original type
  }
}

transformQueryResults(data: any[]): any[] {
  if (!data || data.length === 0) {
    return [];
  }

  // If we have group by applied, data might already be aggregated from the backend
  if (this.selectedGroupBy !== '') {
    return data.map(item => {
      const result: any = {};
      
      this.selectedAttributes.forEach(attr => {
        const key = attr.displayName;
        result[key] = item[attr.column] !== undefined ? item[attr.column] : 
                     (item[attr.displayName] !== undefined ? item[attr.displayName] : null);
      });
      
      return result;
    });
  } else {
    // For non-grouped data, standardize the output format
    return data.map(item => {
      const result: any = {};
      
      this.selectedAttributes.forEach(attr => {
        // Handle both simple column names and fully qualified names (table.column)
        const simpleKey = attr.column;
        const qualifiedKey = attr.displayName;
        
        // Try different ways the API might return the data
        result[qualifiedKey] = 
          item[simpleKey] !== undefined ? item[simpleKey] : 
          item[qualifiedKey] !== undefined ? item[qualifiedKey] :
          item[attr.table]?.[simpleKey] !== undefined ? item[attr.table][simpleKey] : 
          null;
      });
      
      return result;
    });
  }
}

fetchRelatedData(primaryData: any[], relatedTables: string[]): Observable<any[]> {
  if (relatedTables.length === 0) {
    return new Observable(observer => {
      observer.next(primaryData);
      observer.complete();
    });
  }
  
  // Create an array of observables for each related table
  const relatedDataObservables = relatedTables.map(tableName => {
    return this.http.get<any[]>(`${this.baseUrl}/data/${tableName}`);
  });

  return forkJoin(relatedDataObservables).pipe(
    map(relatedDataResults => {
      // Join logic would go here
      // This is a simplified version that would need to be expanded based on your schema
      const result = [...primaryData];
      
      // For each primary data row, find related data
      result.forEach(primaryRow => {
        relatedTables.forEach((tableName, index) => {
          // You would need to define join conditions based on your schema
          const relatedData = relatedDataResults[index];
          primaryRow[`${tableName}_data`] = relatedData;
        });
      });
      
      return result;
    })
  );
}

exportToExcel() {
  if (this.reportData.length === 0) return;
  
  // Create worksheet from JSON data
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.reportData);
  
  // Set column widths
  const columnWidths = this.selectedAttributes.map(() => ({ width: 15 }));
  worksheet['!cols'] = columnWidths;
  
  // Apply styles to header row
  const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    // Create formatted cell with styles
    worksheet[cellAddress].s = {
      fill: { fgColor: { rgb: "4F81BD" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  
  // Add alternating row colors and border styles
  for (let row = headerRange.s.r + 1; row <= headerRange.e.r; row++) {
    const isEvenRow = row % 2 === 0;
    const fillColor = isEvenRow ? "E9EFF7" : "FFFFFF";
    
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: fillColor } },
        border: {
          top: { style: "thin", color: { rgb: "D3D3D3" } },
          bottom: { style: "thin", color: { rgb: "D3D3D3" } },
          left: { style: "thin", color: { rgb: "D3D3D3" } },
          right: { style: "thin", color: { rgb: "D3D3D3" } }
        },
        alignment: { horizontal: "left", vertical: "center" }
      };
    }
  }
  
  // Create workbook and add worksheet
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  
  // Add title worksheet with report information
  const titleWs = XLSX.utils.aoa_to_sheet([
    ['Report Summary'],
    [''],
    ['Generated on:', new Date().toLocaleString()],
    ['Tables included:', this.selectedTables.join(', ')],
    ['Number of records:', this.reportData.length.toString()],
    ['Filters applied:', this.activeFilters.length > 0 ? 'Yes' : 'No'],
    ['Grouped by:', this.selectedGroupBy || 'None']
  ]);
  
  // Style the title worksheet
  titleWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  titleWs['A1'].s = { font: { bold: true, sz: 16, color: { rgb: "4F81BD" } } };
  XLSX.utils.book_append_sheet(workbook, titleWs, 'Summary');
  
  // Generate filename with current date
  const fileName = `report_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // Write workbook and trigger download
  XLSX.writeFile(workbook, fileName);
}
}