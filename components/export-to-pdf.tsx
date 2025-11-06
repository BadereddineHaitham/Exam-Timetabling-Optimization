"use client"

import { jsPDF } from "jspdf"
import "jspdf-autotable"
import html2canvas from "html2canvas"

export async function exportElementToPDF(
  element: HTMLElement,
  filename: string,
  isTable: boolean = false
) {
  if (isTable) {
    const pdf = new jsPDF("p", "mm", "a4")
    const table = element.querySelector("table")

    if (table) {
      ;(pdf as any).autoTable({
        html: table,
        styles: {
          font: "helvetica",
          fontSize: 10,
          cellPadding: 2,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      })
      pdf.save(filename)
    } else {
      console.error("No table found in the element")
    }
  } else {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
    })
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF("p", "mm", "a4")

    const width = pdf.internal.pageSize.getWidth()
    const height = (canvas.height * width) / canvas.width

    pdf.addImage(imgData, "PNG", 0, 0, width, height)
    pdf.save(filename)
  }
}
