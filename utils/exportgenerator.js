const PDFDocument = require('pdfkit');
const fs = require('fs');
const XLSX = require('xlsx');

// For subject teacher marks export
const generatePdf = (marks) => {
  const doc = new PDFDocument({ margin: 30 });
  
  // Add header
  doc.fontSize(18).text('Student Marks Report', { align: 'center' });
  doc.moveDown();
  
  // Create table headers
  const headers = ['Roll No', 'Student Name', 'Q1/Q2', 'Q3/Q4', 'Q5/Q6', 'Q7/Q8', 'Total', 'Status'];
  const columnWidths = [60, 150, 60, 60, 60, 60, 60, 60];
  let y = doc.y;
  
  // Draw headers
  doc.font('Helvetica-Bold');
  headers.forEach((header, i) => {
    doc.text(header, 30 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
      width: columnWidths[i],
      align: 'center'
    });
  });
  doc.moveDown();
  
  // Draw student rows
  doc.font('Helvetica');
  marks.forEach(mark => {
    const student = mark.studentId;
    const exam = mark.exams[0];
    y = doc.y;
    
    // Student info
    doc.text(student.rollNo.toString(), 30, y, { width: columnWidths[0], align: 'center' });
    doc.text(student.name, 30 + columnWidths[0], y, { width: columnWidths[1] });
    
    // Marks
    const marksData = exam.marksObtained;
    doc.text(marksData.q1q2.toString(), 30 + columnWidths[0] + columnWidths[1], y, { 
      width: columnWidths[2], align: 'center' 
    });
    doc.text(marksData.q3q4.toString(), 30 + columnWidths[0] + columnWidths[1] + columnWidths[2], y, { 
      width: columnWidths[3], align: 'center' 
    });
    doc.text(marksData.q5q6.toString(), 30 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y, { 
      width: columnWidths[4], align: 'center' 
    });
    doc.text(marksData.q7q8.toString(), 30 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4], y, { 
      width: columnWidths[5], align: 'center' 
    });
    doc.text(marksData.total.toString(), 30 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5], y, { 
      width: columnWidths[6], align: 'center' 
    });
    doc.text(exam.status, 30 + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5] + columnWidths[6], y, { 
      width: columnWidths[7], align: 'center' 
    });
    
    doc.moveDown();
    // Add line separator
    doc.moveTo(30, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown(0.5);
  });
  
  // Add footer
  doc.text(`Generated on ${new Date().toLocaleString()}`, { align: 'right' });
  
  return doc;
};

// For class teacher marks export
const generateClassPdf = (students, subjects, marksData) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  
  // Add header
  doc.fontSize(18).text('Class Marks Report', { align: 'center' });
  doc.moveDown();
  
  // Create table headers
  const headers = ['Roll No', 'Student Name', ...subjects.map(s => s.name), 'Total'];
  const columnWidths = [60, 150, ...Array(subjects.length).fill(60), 60];
  let y = doc.y;
  
  // Draw headers
  doc.font('Helvetica-Bold');
  headers.forEach((header, i) => {
    doc.text(header, 30 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
      width: columnWidths[i],
      align: 'center'
    });
  });
  doc.moveDown();
  
  // Draw student rows
  doc.font('Helvetica');
  students.forEach(student => {
    y = doc.y;
    
    // Student info
    doc.text(student.rollNo.toString(), 30, y, { width: columnWidths[0], align: 'center' });
    doc.text(student.name, 30 + columnWidths[0], y, { width: columnWidths[1] });
    
    // Subject marks
    let totalMarks = 0;
    subjects.forEach((subject, i) => {
      const studentMarks = marksData.find(m => m.studentId.equals(student._id));
      const subjectMarks = studentMarks?.exams?.filter(e => e.subjectName === subject.name) || [];
      const subjectTotal = subjectMarks.reduce((sum, exam) => sum + (exam.marksObtained?.total || 0), 0);
      totalMarks += subjectTotal;
      
      doc.text(subjectTotal.toString(), 30 + columnWidths[0] + columnWidths[1] + (i * 60), y, { 
        width: columnWidths[2 + i], align: 'center' 
      });
    });
    
    // Total marks
    doc.text(totalMarks.toString(), 30 + columnWidths.slice(0, -1).reduce((a, b) => a + b, 0), y, { 
      width: columnWidths[columnWidths.length - 1], align: 'center' 
    });
    
    doc.moveDown();
    // Add line separator
    doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
    doc.moveDown(0.5);
  });
  
  // Add footer
  doc.text(`Generated on ${new Date().toLocaleString()}`, { align: 'right' });
  
  return doc;
};

// For subject teacher marks export
const generateExcel = (marks) => {
    const workbook = XLSX.utils.book_new();
    
    // Prepare data
    const data = [
      ['Roll No', 'Student Name', 'Q1/Q2', 'Q3/Q4', 'Q5/Q6', 'Q7/Q8', 'Total', 'Status']
    ];
    
    marks.forEach(mark => {
      const student = mark.studentId;
      const exam = mark.exams[0];
      const marksData = exam.marksObtained;
      
      data.push([
        student.rollNo,
        student.name,
        marksData.q1q2,
        marksData.q3q4,
        marksData.q5q6,
        marksData.q7q8,
        marksData.total,
        exam.status
      ]);
    });
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Add to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks Report');
    
    return workbook;
  };
  
  // For class teacher marks export
  const generateClassExcel = (students, subjects, marksData) => {
    const workbook = XLSX.utils.book_new();
    
    // Prepare headers
    const headers = ['Roll No', 'Student Name', ...subjects.map(s => s.name), 'Total'];
    const data = [headers];
    
    // Prepare student data
    students.forEach(student => {
      const row = [student.rollNo, student.name];
      let totalMarks = 0;
      
      subjects.forEach(subject => {
        const studentMarks = marksData.find(m => m.studentId.equals(student._id));
        const subjectMarks = studentMarks?.exams?.filter(e => e.subjectName === subject.name) || [];
        const subjectTotal = subjectMarks.reduce((sum, exam) => sum + (exam.marksObtained?.total || 0), 0);
        totalMarks += subjectTotal;
        row.push(subjectTotal);
      });
      
      row.push(totalMarks);
      data.push(row);
    });
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 10 }, // Roll No
      { wch: 30 }, // Name
      ...Array(subjects.length).fill({ wch: 15 }), // Subjects
      { wch: 15 }  // Total
    ];
    
    // Add to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Class Marks');
    
    return workbook;
  };