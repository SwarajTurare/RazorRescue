from fpdf import FPDF
from datetime import datetime

class RecoveryReportPDF(FPDF):
    def header(self):
        self.set_fill_color(15, 23, 42)
        self.rect(0, 0, 210, 28, 'F')
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(255, 255, 255)
        self.cell(0, 12, "RAZORRESCUE - EXECUTIVE REVENUE AUDIT REPORT", ln=True, align="C")
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Confidential Internal Audit | Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", align="C")

def build_pdf_report(audit_trail: list, total_lost: float, total_recovered: float, penalties_saved: float, output_path: str = "recovery_audit_report.pdf") -> str:
    pdf = RecoveryReportPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    pdf.set_text_color(30, 41, 59)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "1. Executive Summary & Recovery Metrics", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(95, 7, f"Total Revenue at Risk: Rs. {total_lost:,.2f}", border=1)
    pdf.cell(95, 7, f"Total Revenue Recovered: Rs. {total_recovered:,.2f}", border=1, ln=True)
    
    rate = (total_recovered / total_lost * 100) if total_lost > 0 else 0
    pdf.cell(95, 7, f"Recovery Win Rate: {rate:.1f}%", border=1)
    pdf.cell(95, 7, f"Bank Bounce Fees Saved: Rs. {penalties_saved:,.2f}", border=1, ln=True)
    pdf.ln(8)
    
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "2. Bounded Intervention Audit Trail", ln=True)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(241, 245, 249)
    
    pdf.cell(28, 7, "Txn ID", border=1, fill=True)
    pdf.cell(38, 7, "Customer", border=1, fill=True)
    pdf.cell(28, 7, "Amount", border=1, fill=True)
    pdf.cell(50, 7, "Intervention", border=1, fill=True)
    pdf.cell(46, 7, "Channel / Lang", border=1, fill=True, ln=True)
    
    pdf.set_font("Helvetica", "", 8)
    for entry in audit_trail[-15:]:
        pdf.cell(28, 6, str(entry.get("txn_id", "N/A"))[:12], border=1)
        pdf.cell(38, 6, str(entry.get("customer", "N/A"))[:18], border=1)
        pdf.cell(28, 6, f"Rs. {entry.get('amount', 0):,.0f}", border=1)
        pdf.cell(50, 6, str(entry.get("action", "N/A"))[:26], border=1)
        pdf.cell(46, 6, f"WhatsApp ({entry.get('language', 'Eng')})", border=1, ln=True)
        
    pdf.output(output_path)
    return output_path