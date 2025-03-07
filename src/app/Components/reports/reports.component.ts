import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  
  // To track which table's filters and group by are being displayed
  currentDisplayTable: string = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadTables();
    this.loadViews();
    this.initTabs();
  }

  // Add this to your component's TypeScript file

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

  validateSqlQuery() {
    if (!this.sqlQuery || this.sqlQuery.trim() === '') {
      this.sqlIsValid = false;
      this.sqlValidationMessage = 'Please enter a SQL query';
      return;
    }
  
    // Basic validation - check for SELECT keyword
    // In a real application, you would do more thorough validation
    // or send it to the backend for validation
    if (!this.sqlQuery.toUpperCase().includes('SELECT')) {
      this.sqlIsValid = false;
      this.sqlValidationMessage = 'Query must contain a SELECT statement';
      return;
    }
  
    // Simulate validation success
    this.sqlIsValid = true;
    this.sqlValidationMessage = 'SQL query is valid';
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
          columns = columnsMatch[1].split(',').map(col => {
            // Extract column name, handle aliases
            const parts = col.trim().split(/\s+as\s+/i);
            return parts.length > 1 ? parts[1].trim() : parts[0].trim();
          });
        }
      }
  
      // Generate sample data based on the query
      // This is just for demonstration - real implementation would execute the query on the server
      this.generateSampleData(columns);
      
      // Update selected attributes to match the query results
      this.updateSelectedAttributesFromSql(columns);
      
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
    }
  }

  setCurrentDisplayTable(tableName: string) {
    this.currentDisplayTable = tableName;
    // Update filter options and group by options for the current table
    this.updateFilterOptionsForTable(tableName);
    this.updateGroupByOptionsForTable(tableName);
  }

  loadTableSchema(tableName: string) {
    this.isLoading = true;
    this.http.get<any[]>(`${this.baseUrl}/schema/${tableName}`).subscribe(
        (schema) => {
            console.log('Schema for table:', tableName, schema);
            
            // Normalize the schema data to ensure consistent property names
            const normalizedSchema = schema.map(column => {
                return {
                    name: column.name || column.column_name || '',
                    type: column.type || column.data_type || '',
                    // Add other properties as needed
                };
            });
            
            this.tableSchemas[tableName] = normalizedSchema;
            this.updateAvailableAttributes();
            
            // Update filter options and group by options if this is the current display table
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
      this.generateReport();
    }
  }

  removeAttribute(index: number) {
    // Add back to available attributes
    const attribute = this.selectedAttributes[index];
    this.availableAttributes.push(attribute);
    
    // Remove from selected attributes
    this.selectedAttributes.splice(index, 1);
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
    this.generateReport();
  }

  // New method to remove all selected attributes
  removeAllAttributes() {
    this.availableAttributes = [...this.availableAttributes, ...this.selectedAttributes];
    this.selectedAttributes = [];
    this.reportData = [];
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
    
    this.generateReport();
  }

  addFilter() {
    if (this.filterOptions.length > 0) {
      this.activeFilters.push({
        field: this.filterOptions[0].displayName,
        operator: 'equals',
        value: ''
      });
    }
  }

  removeFilter(index: number) {
    this.activeFilters.splice(index, 1);
    this.generateReport();
  }

  applyFilters() {
    this.generateReport();
  }

  setGroupBy(field: string) {
    this.selectedGroupBy = field;
    this.generateReport();
  }

  generateReport() {
    if (this.selectedAttributes.length === 0) {
        this.reportData = [];
        return;
    }

    this.isLoading = true;

    if (this.selectedTables.length > 0) {
        const primaryTable = this.selectedTables[0];

        this.http.get<any[]>(`${this.baseUrl}/data/${primaryTable}`).subscribe(
            (data) => {
                console.log('Raw data received:', data);
                let filteredData = [...data];

                // Apply filters
                if (this.activeFilters.length > 0) {
                    this.activeFilters.forEach(filter => {
                        if (!filter.field || !filter.value) return;
                        
                        const [tableName, columnName] = filter.field.split('.');
                        
                        filteredData = filteredData.filter(item => {
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

                // Apply groupBy if selected
                if (this.selectedGroupBy && this.selectedGroupBy !== '') {
                    const [tableName, columnName] = this.selectedGroupBy.split('.');
                    
                    // Group the data
                    const groupedData: { [key: string]: any[] } = {};
                    
                    filteredData.forEach(item => {
                        // Handle null and undefined values
                        const groupValue = item[columnName] !== null && item[columnName] !== undefined 
                            ? String(item[columnName]) 
                            : 'null';
                            
                        if (!groupedData[groupValue]) {
                            groupedData[groupValue] = [];
                        }
                        groupedData[groupValue].push(item);
                    });

                    // Transform the grouped data for display
                    const transformedData = Object.keys(groupedData).map(key => {
                        const result: any = {};
                        const items = groupedData[key];
                        
                        // For each selected attribute, calculate appropriate aggregation
                        this.selectedAttributes.forEach(attr => {
                            const attrColumn = attr.column;
                            
                            // For the grouping column, use the group key
                            if (attr.table === tableName && attr.column === columnName) {
                                result[attr.displayName] = key === 'null' ? null : key;
                            } else {
                                // For numeric columns, apply aggregation
                                const values = items.map(item => item[attrColumn])
                                    .filter(v => v !== null && v !== undefined);
                                
                                // Determine if values are numeric
                                const isNumeric = this.isNumericArray(values);
                                
                                if (isNumeric) {
                                    // For numeric values, apply sum aggregation
                                    const numericValues = values.map(v => Number(v));
                                    result[attr.displayName] = this.calculateAggregate(numericValues, 'sum');
                                } else if (values.length > 0) {
                                    // For non-numeric values, count unique values
                                    const uniqueValues = [...new Set(values)];
                                    
                                    if (uniqueValues.length === 1) {
                                        // If all values are the same, use that value
                                        result[attr.displayName] = uniqueValues[0];
                                    } else if (uniqueValues.length <= 3) {
                                        // If there are few unique values, show them all
                                        result[attr.displayName] = uniqueValues.join(', ');
                                    } else {
                                        // Otherwise, show count of unique values
                                        result[attr.displayName] = `${uniqueValues.length} unique values`;
                                    }
                                } else {
                                    // No values
                                    result[attr.displayName] = 'N/A';
                                }
                            }
                        });
                        
                        return result;
                    });
                    
                    this.reportData = transformedData;
                } else {
                    // No grouping - create transformed data based on selected attributes
                    this.reportData = filteredData.map(item => {
                        const result: any = {};
                        
                        this.selectedAttributes.forEach(attr => {
                            const columnName = attr.column;
                            
                            // For primary table, directly map the values
                            if (attr.table === primaryTable) {
                                result[attr.displayName] = item[columnName];
                            } else {
                                // For related tables
                                result[attr.displayName] = 'N/A';
                            }
                        });
                        
                        return result;
                    });
                }
                
                console.log('Processed report data:', this.reportData);
                this.isLoading = false;
            },
            (error) => {
                console.error(`Error loading data for ${primaryTable}`, error);
                this.isLoading = false;
            }
        );
    }
  }

  // Helper method to check if an array contains numeric values
  isNumericArray(values: any[]): boolean {
    if (!values || values.length === 0) return false;
    
    // Check if at least 50% of values are numeric
    const numericCount = values.filter(val => !isNaN(Number(val)) && val !== '').length;
    return numericCount / values.length >= 0.5;
  }

  calculateAggregate(values: number[], type: string): number {
    if (!values || values.length === 0) return 0;
    
    switch (type) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return Number((values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(2));
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      default:
        return values.reduce((sum, val) => sum + val, 0);
    }
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