import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // <-- change import

export default function PDFTest() {
  function testPDF() {
    const doc = new jsPDF();
    autoTable(doc, { head: [["A", "B"]], body: [["1", "2"]] }); // <-- change usage
    doc.save("test.pdf");
  }
  return <button onClick={testPDF}>Test PDF Export</button>;
}