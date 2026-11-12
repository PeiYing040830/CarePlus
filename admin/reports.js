let revenueChart, statusChart;

window.addEventListener('load', function() {
    initCharts();
    injectToastStyles();
});

function initCharts() {

    // Trend Line Chart
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: trendData.map(d => d.date),
            datasets: [
                {
                    label: 'Completed',
                    data: trendData.map(d => d.completed),
                    borderColor: '#10b981',
                    backgroundColor: '#10b98122',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Confirmed',
                    data: trendData.map(d => d.confirmed),
                    borderColor: '#3b82f6',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.3
                },
                {
                    label: 'Pending',
                    data: trendData.map(d => d.pending),
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    tension: 0.3
                },
                {
                    label: 'Cancelled',
                    data: trendData.map(d => d.cancelled),
                    borderColor: '#ef4444',
                    backgroundColor: 'transparent',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Appointment Status Breakdown (Doughnut)
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: statusData.map(d => d.status.toUpperCase()),
            datasets: [{
                data: statusData.map(d => d.count),
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// ✅ Single setDateRange function (uses serverDate + submits reportFilterForm)
function setDateRange(range) {
    const serverDate = document.body?.dataset?.serverDate;
    const baseDate = serverDate ? new Date(`${serverDate}T00:00:00`) : new Date();
    const today = baseDate.toISOString().split('T')[0];
    const dateFromInput = document.querySelector('input[name="date_from"]');
    const dateToInput = document.querySelector('input[name="date_to"]');

    dateToInput.value = today;

    switch(range) {
        case 'today':
            dateFromInput.value = today;
            break;
        case 'week':
            const weekAgo = new Date(baseDate);
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateFromInput.value = weekAgo.toISOString().split('T')[0];
            break;
        case 'month':
            const monthAgo = new Date(baseDate);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateFromInput.value = monthAgo.toISOString().split('T')[0];
            break;
        case 'year':
            const currentYear = baseDate.getFullYear();
            dateFromInput.value = `${currentYear}-01-01`;
            break;
    }

    document.getElementById('reportFilterForm').submit();
}

// Notification System
function injectToastStyles() {
    if (document.getElementById('toast-styles')) return; // Prevent duplicate injection
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .toast-notification {
            animation: slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            transition: opacity 0.5s ease;
        }
    `;
    document.head.appendChild(style);
}

function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.toast-notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `toast-notification toast-${type}`;

    const colors = {
        success: '#66BB6A',
        error: '#EF5350',
        warning: '#FF9800',
        info: '#42A5F5'
    };

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;

    notification.innerHTML = `
        <span style="font-size: 1.2rem;">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => { if (notification.parentNode) notification.remove(); }, 500);
    }, 3000);
}

// Data Extraction Helpers
function extractStatistics() {
    const stats = {};
    document.querySelectorAll('.stat-card').forEach(card => {
        const label = card.querySelector('.stat-content p').textContent.trim();
        const value = card.querySelector('.stat-content h3').textContent.trim();
        stats[label] = value;
    });
    return stats;
}

function extractDoctorsData() {
    const doctors = [];
    const rows = document.querySelectorAll('.data-table tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
            doctors.push({
                rank: cells[0].textContent.trim(),
                doctor: cells[1].textContent.trim(),
                specialization: cells[2].textContent.trim(),
                appointments: cells[3].textContent.trim(),
                performance: cells[4].textContent.trim()
            });
        }
    });
    return doctors;
}

// Export Analytics CSV
function exportReport() {
    try {
        const dateFrom = document.querySelector('input[name="date_from"]').value;
        const dateTo = document.querySelector('input[name="date_to"]').value;
        const stats = extractStatistics();
        const doctors = extractDoctorsData();

        let csv = 'CarePlus Medical Center - Appointment Analytics\n';
        csv += `Date Range: ${dateFrom} to ${dateTo}\n\n`;

        csv += 'SUMMARY\nMetric,Value\n';
        for (const [key, value] of Object.entries(stats)) {
            csv += `"${key}","${value}"\n`;
        }

        csv += '\nTOP DOCTORS\nRank,Doctor,Specialization,Appointments,Performance\n';
        doctors.forEach(doc => {
            csv += `"${doc.rank}","${doc.doctor}","${doc.specialization}","${doc.appointments}","${doc.performance}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CarePlus_Report_${dateFrom}_to_${dateTo}.csv`;
        a.click();

        showNotification('Report exported successfully!', 'success');
    } catch (error) {
        showNotification('Failed to export CSV', 'error');
    }
}

// Export Analytics PDF
function exportReportsPDF() {
    if (typeof window.jspdf === 'undefined') {
        showNotification('PDF library not loaded!', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const primaryColor = [255, 140, 66];
    const secondaryColor = [44, 62, 80];
    const lightGray = [245, 245, 245];
    const white = [255, 255, 255];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('CarePlus', 15, 18);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Comprehensive Analytics & Performance Report', 15, 26);

    const dateFrom = document.querySelector('input[name="date_from"]').value;
    const dateTo = document.querySelector('input[name="date_to"]').value;
    doc.setFontSize(9);
    doc.text(`Report Period: ${dateFrom} to ${dateTo}`, 195, 15, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, 195, 20, { align: 'right' });

    const statsCards = document.querySelectorAll('.stat-card');
    let totalAppt = statsCards[0]?.querySelector('h3')?.textContent || '0';
    let activePatients = statsCards[1]?.querySelector('h3')?.textContent || '0';
    let completionRate = statsCards[2]?.querySelector('h3')?.textContent || '0%';

    doc.setFillColor(...lightGray);
    doc.roundedRect(15, 45, 180, 22, 3, 3, 'F');

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL APPOINTMENTS', 20, 52);
    doc.text('ACTIVE PATIENTS', 80, 52);
    doc.text('AVG COMPLETION RATE', 140, 52);

    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(totalAppt, 20, 60);
    doc.text(activePatients, 80, 60);
    doc.text(completionRate, 140, 60);

    const rows = document.querySelectorAll('.data-table tbody tr');
    const tableBody = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 1) {
            const performancePct = cells[4].querySelector('span')?.textContent || '0%';
            tableBody.push([
                cells[0].textContent.trim(),
                cells[1].textContent.trim(),
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                performancePct
            ]);
        }
    });

    if (tableBody.length === 0) {
        showNotification('No data found in the table to export', 'warning');
        return;
    }

    doc.autoTable({
        startY: 75,
        head: [['Rank', 'Doctor Name', 'Specialization', 'Total Appts', 'Performance']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
            fillColor: primaryColor,
            textColor: 255,
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 50 },
            2: { cellWidth: 50 },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 30, fontStyle: 'bold', halign: 'center' }
        },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 4) {
                const val = parseInt(data.cell.raw);
                if (val >= 70) data.cell.styles.textColor = [16, 185, 129];
                else if (val >= 40) data.cell.styles.textColor = [59, 130, 246];
                else data.cell.styles.textColor = [245, 158, 11];
            }
        },
        margin: { left: 15, right: 15 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('CarePlus Smart Clinic Management Portal - Analytics Report', 15, pageHeight - 15);
        doc.text('Confidential Administrative Document - Internal Use Only', 15, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`CarePlus_Performance_Report_${timestamp}.pdf`);

    showNotification('Analytics report downloaded successfully!', 'success');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportReport();
    }
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        window.print();
    }
});
