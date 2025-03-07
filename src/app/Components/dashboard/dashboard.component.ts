import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';

// Register Chart.js components
Chart.register(...registerables);

interface HospitalData {
  patientid: number;
  patientfirstname: string;
  patientlastname: string;
  dateofbirth: string;
  gender: string;
  patientcontact: string;
  patientemail: string;
  patientaddress: string;
  doctorid: number;
  doctorfirstname: string;
  doctorlastname: string;
  specialization: string;
  doctorcontact: string;
  doctoremail: string;
  appointmentid: number;
  appointmentdate: string;
  appointmentstatus: string;
  appointmentnotes: string;
  treatmentid: number;
  treatmentname: string;
  treatmentcost: number;
  treatmentdate: string;
  billid: number;
  totalamount: number;
  paymentstatus: string;
  paymentmethod: string;
  billdate: string;
}

interface DoctorWorkload {
  id: number;
  name: string;
  specialization: string;
  appointmentCount: number;
  initials: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [CommonModule]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef;
  @ViewChild('paymentChart') paymentChartRef!: ElementRef;
  
  currentDate: Date = new Date();
  dashboardData: HospitalData[] = [];
  filteredData: HospitalData[] = [];
  uniqueDoctors: { id: number, name: string, specialization: string }[] = [];
  doctorWorkload: DoctorWorkload[] = [];
  totalRevenue: number = 0;
  
  revenueChart: any;
  paymentChart: any;
  
  constructor(private http: HttpClient) {}
  
  ngOnInit(): void {
    this.fetchData();
  }
  
  ngAfterViewInit(): void {
    // Charts will be initialized after data is loaded
  }
  
  fetchData(): void {
    this.http.get<HospitalData[]>('https://localhost:7129/api/Database/data/hospitaloverview')
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.filteredData = [...data];
          this.processData();
          this.initCharts();
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        }
      });
  }
  
  processData(): void {
    // Calculate total revenue
    this.totalRevenue = this.dashboardData.reduce((sum, item) => sum + item.treatmentcost, 0);
    
    // Get unique doctors
    const doctorMap = new Map<number, { id: number, name: string, specialization: string }>();
    
    this.dashboardData.forEach(item => {
      if (!doctorMap.has(item.doctorid)) {
        doctorMap.set(item.doctorid, {
          id: item.doctorid,
          name: `${item.doctorfirstname} ${item.doctorlastname}`,
          specialization: item.specialization
        });
      }
    });
    
    this.uniqueDoctors = Array.from(doctorMap.values());
    
    // Calculate doctor workload
    this.doctorWorkload = this.uniqueDoctors.map(doctor => {
      const appointments = this.dashboardData.filter(item => item.doctorid === doctor.id);
      const initials = doctor.name
        .split(' ')
        .map(name => name.startsWith('Dr.') ? name.charAt(3) : name.charAt(0))
        .join('');
      
      return {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        appointmentCount: appointments.length,
        initials
      };
    }).sort((a, b) => b.appointmentCount - a.appointmentCount);
  }
  
  initCharts(): void {
    this.initRevenueChart();
    this.initPaymentChart();
  }
  
  initRevenueChart(): void {
    if (this.revenueChartRef) {
      const canvas = this.revenueChartRef.nativeElement;
      const ctx = canvas.getContext('2d');
      
      // Group treatments by name and sum costs
      const treatmentData = new Map<string, number>();
      
      this.dashboardData.forEach(item => {
        const currentValue = treatmentData.get(item.treatmentname) || 0;
        treatmentData.set(item.treatmentname, currentValue + item.treatmentcost);
      });
      
      const labels = Array.from(treatmentData.keys());
      const data = Array.from(treatmentData.values());
      
      // Generate colors based on treatment count
      const colors = this.generateColors(labels.length);
      
      this.revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Revenue (₹)',
            data: data,
            backgroundColor: colors,
            borderColor: colors.map(color => color.replace('0.7', '1')),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => '₹' + value
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => `Revenue: ₹${context.raw}`
              }
            }
          }
        }
      });
    }
  }
  
  initPaymentChart(): void {
    if (this.paymentChartRef) {
      const canvas = this.paymentChartRef.nativeElement;
      const ctx = canvas.getContext('2d');
      
      // Count paid vs pending payments
      const paidCount = this.dashboardData.filter(item => item.paymentstatus === 'Paid').length;
      const pendingCount = this.dashboardData.filter(item => item.paymentstatus === 'Pending').length;
      
      this.paymentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Paid', 'Pending'],
          datasets: [{
            data: [paidCount, pendingCount],
            backgroundColor: [
              'rgba(76, 175, 80, 0.7)',  // Green for paid
              'rgba(255, 152, 0, 0.7)'   // Orange for pending
            ],
            borderColor: [
              'rgba(76, 175, 80, 1)',
              'rgba(255, 152, 0, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  const percent = Math.round(
                    (Number(context.raw) / this.dashboardData.length) * 100
                  );
                  return `${context.label}: ${context.raw} (${percent}%)`;
                }
              }
            }
          }
        }
      });
    }
  }
  
  generateColors(count: number): string[] {
    // Generate a gradient of colors from primary to secondary
    const colors: string[] = [];
    const primaryColor = [26, 35, 126]; // RGB for #1a237e
    const secondaryColor = [121, 134, 203]; // RGB for #7986cb
    
    for (let i = 0; i < count; i++) {
      const ratio = i / (count - 1 || 1);
      const r = Math.round(primaryColor[0] + ratio * (secondaryColor[0] - primaryColor[0]));
      const g = Math.round(primaryColor[1] + ratio * (secondaryColor[1] - primaryColor[1]));
      const b = Math.round(primaryColor[2] + ratio * (secondaryColor[2] - primaryColor[2]));
      
      colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
    }
    
    return colors;
  }
  
  filterChart(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const filterValue = selectElement.value;
    
    let filteredData: HospitalData[] = [...this.dashboardData];
    
    // Apply date filtering
    const now = new Date();
    if (filterValue === 'week') {
      // Filter for the current week
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      filteredData = filteredData.filter(item => {
        const appointmentDate = new Date(item.appointmentdate);
        return appointmentDate >= oneWeekAgo && appointmentDate <= now;
      });
    } else if (filterValue === 'month') {
      // Filter for the current month
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      filteredData = filteredData.filter(item => {
        const appointmentDate = new Date(item.appointmentdate);
        return appointmentDate >= oneMonthAgo && appointmentDate <= now;
      });
    }
    
    // Update filtered data for the table
    this.filteredData = filteredData;
    
    // Update charts with the filtered data
    this.updateCharts(filteredData);
  }
  
  updateCharts(filteredData: HospitalData[]): void {
    // Update Revenue Chart
    if (this.revenueChart) {
      // Recalculate treatment data
      const treatmentData = new Map<string, number>();
      
      filteredData.forEach(item => {
        const currentValue = treatmentData.get(item.treatmentname) || 0;
        treatmentData.set(item.treatmentname, currentValue + item.treatmentcost);
      });
      
      this.revenueChart.data.labels = Array.from(treatmentData.keys());
      this.revenueChart.data.datasets[0].data = Array.from(treatmentData.values());
      this.revenueChart.update();
    }
    
    // Update Payment Chart
    if (this.paymentChart) {
      const paidCount = filteredData.filter(item => item.paymentstatus === 'Paid').length;
      const pendingCount = filteredData.filter(item => item.paymentstatus === 'Pending').length;
      
      this.paymentChart.data.datasets[0].data = [paidCount, pendingCount];
      this.paymentChart.update();
    }
  }
  
  searchPatients(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const searchTerm = inputElement.value.toLowerCase();
    
    if (!searchTerm) {
      this.filteredData = [...this.dashboardData];
      return;
    }
    
    this.filteredData = this.dashboardData.filter(item => {
      const patientName = `${item.patientfirstname} ${item.patientlastname}`.toLowerCase();
      const doctorName = `${item.doctorfirstname} ${item.doctorlastname}`.toLowerCase();
      const treatment = item.treatmentname.toLowerCase();
      
      return patientName.includes(searchTerm) || 
             doctorName.includes(searchTerm) || 
             treatment.includes(searchTerm);
    });
  }
}