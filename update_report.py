import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update getReportRemark and add getGradeFromScore
old_remark = """  const getReportRemark = (score: number) => {
    if (score >= 80) return "A";
    if (score > 69) return "AP";
    if (score > 59) return "D";
    return "B";
  };"""

new_remark = """  const getReportRemark = (score: number) => {
    if (score >= 80) return "A";
    if (score >= 75) return "P";
    if (score >= 70) return "AP";
    if (score >= 50) return "D";
    return "B";
  };

  const getGradeFromScore = (score: number) => {
    if (score >= 80) return 1;
    if (score >= 75) return 2;
    if (score >= 70) return 3;
    if (score >= 50) return 4;
    return 5;
  };"""

content = content.replace(old_remark, new_remark)

# 2. Update printedRows calculation
old_printed_rows = """      const printedRows = report.subjects.map((subName) => {
        const row = getStudentSubjectReport(studentName, subName);
        const totals = activeStudents.map(name => getStudentSubjectReport(name, subName).total).filter(t => t > 0);
        const classAvg = totals.length > 0 ? Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)) : 0;
        const grade = getBeceGrade(row.total);
        return {
          ...row,
          classAvg,
          grade,
        };
      });"""

new_printed_rows = """      const printedRows = report.subjects.map((subName) => {
        const row = getStudentSubjectReport(studentName, subName);
        const totals = activeStudents.map(name => getStudentSubjectReport(name, subName).total).filter(t => t > 0);
        const classAvg = totals.length > 0 ? Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)) : 0;
        const grade = getGradeFromScore(row.total);
        return {
          ...row,
          classAvg,
          grade,
        };
      });"""

content = content.replace(old_printed_rows, new_printed_rows)

# 3. Update the rowsHtml to change Remark to Comment
old_rows_html = """      const rowsHtml = printedRows.map((row) => `
        <tr style="border: 1px solid #000;">
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11px; font-weight: 500;">${row.subjectName.toUpperCase()}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11.5px; font-weight: 600; text-align: center;">${row.classScore.toFixed(1)}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11.5px; font-weight: 600; text-align: center;">${row.examScoreSubtotal.toFixed(1)}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 12px; font-weight: bold; text-align: center;">${row.total.toFixed(1)}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 12px; font-weight: bold; text-align: center;">${row.grade}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11px; text-align: center;">${row.classAvg.toFixed(1)}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11.5px; font-weight: 600; text-align: center;">${row.remark}</td>
        </tr>
      `).join("");"""

new_rows_html = """      const rowsHtml = printedRows.map((row) => `
        <tr style="border: 1px solid #000;">
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11px; font-weight: 500;">${row.subjectName.toUpperCase()}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11.5px; font-weight: 600; text-align: center;">${row.classScore.toFixed(1)}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11.5px; font-weight: 600; text-align: center;">${row.examScoreSubtotal.toFixed(1)}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 12px; font-weight: bold; text-align: center;">${row.total.toFixed(1)}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 12px; font-weight: bold; text-align: center;">${row.grade}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11px; text-align: center;">${row.classAvg.toFixed(1)}</td>
          <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11.5px; font-weight: 600; text-align: center;">${row.remark}</td>
        </tr>
      `).join("");"""

# wait, rowsHtml didn't change! The header changed!
# Let's fix the header.
old_table_header = """<th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: center; width: 16%;">Remark</th>"""
new_table_header = """<th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: center; width: 16%;">Comment</th>"""

content = content.replace(old_table_header, new_table_header)

# 4. Update the profile section to remove internal borders and match layout
# Regex or exact replace for the profile section
old_profile = '''            <!-- Student Profile Section -->
            <table style="width:100%; border-collapse: collapse; margin-top: 6px; border: 1.5px solid #000;">
              <tr>
                <td colspan="2" style="background: #e2e8f0; padding: 4px; text-align: center; font-weight: 800; font-size: 12.5px; border: 1.5px solid #000; font-family:'Segoe UI', Arial, sans-serif;">NAME OF STUDENT: ${studentName.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 4px; font-size: 11px; font-weight: 700; width: 50%; border: 1.5px solid #000;">Sex: <span style="font-weight: 500;">${sex.toUpperCase()}</span></td>
                <td style="padding: 4px; font-size: 11px; font-weight: 700; width: 50%; border: 1.5px solid #000; text-align: right;">Class Roll: <span style="font-weight: 500;">${classRoll}</span></td>
              </tr>
              <tr>
                <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000;">BASIC: <span style="font-weight: 500;">${className.replace(/\\D/g, "") || className}</span></td>
                <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000; text-align: right;">Term: <span style="font-weight: 500;">${termFilter.replace(/\\D/g, "") || termFilter}</span></td>
              </tr>
              <tr>
                <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000;">ATTENDANCE: <span style="font-weight: 500;">${attendanceVal || "N/A"}</span></td>
                <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000; text-align: right;">Date: <span style="font-weight: 500;">${vacationDate}</span></td>
              </tr>
            </table>'''

new_profile = '''            <!-- Student Profile Section -->
            <div style="margin-top: 6px; border: 1.5px solid #000;">
              <div style="background: #cbd5e1; padding: 6px; text-align: center; font-weight: 800; font-size: 12.5px; font-family:'Segoe UI', Arial, sans-serif;">NAME OF STUDENT: ${studentName.toUpperCase()}</div>
              <div style="display: flex; justify-content: space-between; padding: 6px 15px; font-size: 11px; font-weight: 700;">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div>Sex: <span style="font-weight: 500; margin-left: 45px;">${sex.toUpperCase()}</span></div>
                  <div>BASIC: <span style="font-weight: 500; margin-left: 30px;">${className.replace(/\\D/g, "") || className}</span></div>
                  <div>ATTENDANCE: <span style="font-weight: 500; margin-left: 5px;">${attendanceVal || "N/A"}</span></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div>Class Roll: <span style="font-weight: 500; margin-left: 20px;">${classRoll}</span></div>
                  <div>Term: <span style="font-weight: 500; margin-left: 40px;">${termFilter.replace(/\\D/g, "") || termFilter}</span></div>
                  <div>Date: <span style="font-weight: 500; margin-left: 45px;">${vacationDate}</span></div>
                </div>
              </div>
            </div>'''

content = content.replace(old_profile, new_profile)

# 5. Legend Colors
old_legend_table_start = '''<table style="width:100%; border-collapse: collapse; margin-top: 4px; border: 1.5px solid #000;">
              <tr>
                <td rowspan="2" style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; width: 15%; background: #f1f5f9;">IF TOTAL SCORE</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; font-weight: 700; width: 35%; background: #fff;">&gt;=80 - A , &gt;=75 - P , &gt;=70 - AP</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">A</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">P</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">AP</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">D</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">B</td>
              </tr>
              <tr>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; font-weight: 700; background: #fff;">&gt;=50 - D , &lt;=50 - B</td>'''

new_legend_table_start = '''<table style="width:100%; border-collapse: collapse; margin-top: 4px; border: 1.5px solid #000; background: #cbd5e1;">
              <tr>
                <td rowspan="2" style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; width: 15%;">IF TOTAL SCORE</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; text-align: center; font-weight: 700; width: 35%;">&gt;=80 - A , &gt;=75 - P , &gt;=70 - AP</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 9.5px; font-weight: 800; text-align: center; width: 10%;">A</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 9.5px; font-weight: 800; text-align: center; width: 10%;">P</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 9.5px; font-weight: 800; text-align: center; width: 10%;">AP</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 9.5px; font-weight: 800; text-align: center; width: 10%;">D</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 9.5px; font-weight: 800; text-align: center; width: 10%;">B</td>
              </tr>
              <tr>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; text-align: center; font-weight: 700;">&gt;=50 - D , &lt;=50 - B</td>'''

content = content.replace(old_legend_table_start, new_legend_table_start)

# Update legend table cells
old_legend_table_cells = '''                <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Advance</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Proficient</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Approaching Proficiency</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Developing</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Beginning</td>'''

new_legend_table_cells = '''                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; text-align: center; color: #000; font-weight: 700;">Advance</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; text-align: center; color: #000; font-weight: 700;">Proficient</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; text-align: center; color: #000; font-weight: 700;">Approaching<br/>Proficiency</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; text-align: center; color: #000; font-weight: 700;">Developing</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; text-align: center; color: #000; font-weight: 700;">Beginning</td>'''

content = content.replace(old_legend_table_cells, new_legend_table_cells)

# 6. Update the Graphical Representation Banner
old_graph_banner = '''<!-- Graphical Representation Banner -->
            <div style="background: #e2e8f0; border: 1.5px solid #000; border-top: none; text-align: center; font-weight: 800; font-size: 9.5px; padding: 1.5px; letter-spacing: 0.5px; font-family:'Segoe UI', Arial, sans-serif;">GRAPHICAL REPRESENTATION OF RESULT BY TOTAL SCORE</div>'''

new_graph_banner = '''<!-- Graphical Representation Banner -->
            <div style="background: #cbd5e1; border: 1.5px solid #000; border-top: none; text-align: center; font-weight: 800; font-size: 10.5px; padding: 3px; letter-spacing: 0.5px; font-family:'Segoe UI', Arial, sans-serif; margin-top: 4px; color: #333;">GRAPHICAL REPRESENTATION OF RESULT BY TOTAL SCORE</div>'''

content = content.replace(old_graph_banner, new_graph_banner)


# 7. Update footer (Traits and Signatures)
old_footer = '''<!-- Reopen date & Overall score box -->
            <div style="display: flex; justify-content: space-between; margin-top: 5px; align-items: stretch; gap: 10px;">
              <div style="flex: 1; border: 1.5px solid #000; padding: 5px; font-size: 10.5px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; background: #fff;">
                <span>School Reopens on:</span>
                <span style="border: 1.5px solid #000; padding: 3px 8px; font-weight: 800; background: #f8fafc; font-size: 10px;">${reopeningDate}</span>
              </div>
              <table style="border: 1.5px solid #000; border-collapse: collapse; font-size: 10px; width: 170px; background: #fff;">
                <tr>
                  <td style="border: 1.5px solid #000; padding: 3px; font-weight: 700; background: #f1f5f9;">Overall Score</td>
                  <td style="border: 1.5px solid #000; padding: 3px; font-weight: 800; text-align: center; width: 70px;">${totalScore.toFixed(1)}</td>
                </tr>
                <tr>
                  <td style="border: 1.5px solid #000; padding: 3px; font-weight: 700; text-align: right; background: #f1f5f9;">Out of</td>
                  <td style="border: 1.5px solid #000; padding: 3px; font-weight: 800; text-align: center;">${(printedRows.length * 100).toFixed(1)}</td>
                </tr>
              </table>
            </div>

            <!-- Traits and comments Section -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 5px; border: 1.5px solid #000; font-size: 10px; background: #fff;">
              <tr style="background: #f1f5f9;">
                <td style="border: 1.5px solid #000; padding: 4px; font-weight: 700; text-align: center; width: 33.3%;">Conduct</td>
                <td style="border: 1.5px solid #000; padding: 4px; font-weight: 700; text-align: center; width: 33.3%;">Attitude</td>
                <td style="border: 1.5px solid #000; padding: 4px; font-weight: 700; text-align: center; width: 33.3%;">Interest</td>
              </tr>
              <tr>
                <td style="border: 1.5px solid #000; padding: 4px; font-weight: 800; text-align: center; font-size: 11px;">${conduct.toUpperCase() || "?""}</td>
                <td style="border: 1.5px solid #000; padding: 4px; font-weight: 800; text-align: center; font-size: 11px;">${attitude.toUpperCase() || "?""}</td>
                <td style="border: 1.5px solid #000; padding: 4px; font-weight: 800; text-align: center; font-size: 11px;">${interest.toUpperCase() || "?""}</td>
              </tr>
              <tr>
                <td colspan="3" style="border: 1.5px solid #000; padding: 6px; line-height: 1.4; min-height: 35px;">
                  <div style="font-weight: 700; text-decoration: underline; margin-bottom: 2px;">Class Master/Mistress' Comment:</div>
                  <div style="font-size: 11px; color: #0f172a;">${commentText || "No comment report submitted."}</div>
                </td>
              </tr>
            </table>

            <!-- Signatures Section -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 5px; border: 1.5px solid #000; font-size: 10px; background: #fff;">
              <tr>
                <td style="border: 1.5px solid #000; padding: 12px 10px; width: 50%; height: 50px; vertical-align: bottom;">
                  <div style="display: flex; align-items: flex-end; justify-content: space-between;">
                    <span style="font-weight: 700; font-size: 11px;">Class Teacher's Signature:</span>
                    <div style="border-bottom: 1.5px dashed #000; width: 160px; height: 1px; margin-bottom: 2px;"></div>
                  </div>
                </td>
                <td style="border: 1.5px solid #000; padding: 12px 10px; width: 50%; height: 50px; vertical-align: bottom;">
                  <div style="display: flex; align-items: flex-end; justify-content: space-between;">
                    <span style="font-weight: 700; font-size: 11px;">Headmaster's Signature:</span>
                    <div style="border-bottom: 1.5px dashed #000; width: 160px; height: 1px; margin-bottom: 2px;"></div>
                  </div>
                </td>
              </tr>
            </table>'''

new_footer = '''<!-- Reopen date & Overall score box -->
            <div style="display: flex; justify-content: space-between; margin-top: 15px; align-items: stretch; gap: 10px;">
              <div style="font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                <span>School Reopens on:</span>
                <span style="background: #cbd5e1; padding: 4px 10px; font-weight: 800; font-size: 12px;">${reopeningDate}</span>
              </div>
              <div style="display: flex; align-items: stretch;">
                <div style="font-style: italic; font-size: 12px; font-weight: 700; margin-right: 15px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                  <div>Overall Score</div>
                  <div>Out of</div>
                </div>
                <table style="border: 1.5px solid #000; border-collapse: collapse; font-size: 12px; width: 100px; background: #cbd5e1;">
                  <tr>
                    <td style="border: 1.5px solid #000; padding: 4px; font-weight: 800; text-align: center;">${totalScore.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="border: 1.5px solid #000; padding: 4px; font-weight: 800; text-align: center;">${(printedRows.length * 100).toFixed(2)}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Traits and comments Section -->
            <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 12px; padding: 0 40px;">
              <div style="text-align: center;">
                <div style="font-weight: 700; margin-bottom: 4px;">Conduct</div>
                <div style="font-weight: 800;">${conduct.toUpperCase() || "N/A"}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-weight: 700; margin-bottom: 4px;">Attitude</div>
                <div style="font-weight: 800;">${attitude.toUpperCase() || "N/A"}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-weight: 700; margin-bottom: 4px;">Interest</div>
                <div style="font-weight: 800;">${interest.toUpperCase() || "N/A"}</div>
              </div>
            </div>

            <div style="margin-top: 15px; font-size: 12px; border: 1.5px solid #000; border-bottom: none; padding: 6px;">
              <div style="font-weight: 700; text-decoration: underline; margin-bottom: 4px;">Class Master/Mistress' Comment</div>
              <div style="font-style: italic; font-weight: 600;">${commentText || "No comment report submitted."}</div>
            </div>

            <!-- Signatures Section -->
            <div style="display: flex; flex-direction: column; align-items: flex-end; font-size: 12px; gap: 20px; border: 1.5px solid #000; padding: 25px 30px 15px 30px; background: #fff;">
              <div style="display: flex; align-items: flex-end; gap: 10px;">
                <span style="font-weight: 700;">Signature</span>
                <div style="border-bottom: 1.5px solid #000; width: 250px; height: 1px;"></div>
              </div>
              <div style="display: flex; align-items: flex-end; gap: 10px;">
                <span style="font-weight: 700;">Head master/Head Mistress' Signature</span>
                <div style="border-bottom: 1.5px solid #000; width: 250px; height: 1px;"></div>
              </div>
            </div>'''

content = content.replace(old_footer, new_footer)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")
