import jsPDF from 'jspdf';

const clampScore = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
};

const scoreColor = (score) => {
  if (score === null) return { r: 148, g: 163, b: 184 };
  if (score > 80) return { r: 16, g: 185, b: 129 };
  if (score >= 50) return { r: 250, g: 204, b: 21 };
  return { r: 248, g: 113, b: 113 };
};

const severityColor = (severity) => {
  switch ((severity || '').toLowerCase()) {
    case 'high':
      return { r: 239, g: 68, b: 68 };
    case 'medium':
      return { r: 245, g: 158, b: 11 };
    default:
      return { r: 59, g: 130, b: 246 };
  }
};

const ensureSpace = (doc, y, needed, margin) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return y;
};

const drawScoreCard = (doc, { x, y, width, height, label, score }) => {
  const safeScore = clampScore(score);
  const color = scoreColor(safeScore);
  const barWidth = safeScore !== null ? ((width - 10) * safeScore) / 100 : 0;

  doc.setDrawColor(230, 232, 239);
  doc.setFillColor(247, 248, 252);
  doc.rect(x, y, width, height, 'F');

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(label, x + 4, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(color.r, color.g, color.b);
  doc.text(safeScore !== null ? `${safeScore}` : '—', x + width - 6, y + 18, {
    align: 'right',
  });

  doc.setDrawColor(224, 228, 235);
  doc.rect(x + 4, y + height - 8, width - 8, 4);
  if (safeScore !== null) {
    doc.setFillColor(color.r, color.g, color.b);
    doc.rect(x + 4, y + height - 8, barWidth, 4, 'F');
  }
};

const splitText = (doc, text, maxWidth) =>
  doc.splitTextToSize(text ?? 'Information unavailable.', maxWidth);

export const generatePDFReport = (analysis) => {
  if (!analysis) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Header
  doc.setFillColor(5, 11, 31);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ConvertX Website Audit Report', pageWidth / 2, 16, {
    align: 'center',
  });

  const formattedDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`URL: ${analysis?.url ?? 'Not provided'}`, margin, 28);
  doc.text(`Date: ${formattedDate}`, pageWidth - margin, 28, { align: 'right' });

  const growthScore = clampScore(analysis?.growth_score);
  const growthColor = scoreColor(growthScore);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Growth Score', margin, 36);
  doc.setFontSize(30);
  doc.setTextColor(growthColor.r, growthColor.g, growthColor.b);
  doc.text(growthScore !== null ? `${growthScore}` : '—', pageWidth - margin, 36, {
    align: 'right',
  });

  let y = 52;
  const addDivider = () => {
    doc.setDrawColor(210, 214, 222);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  };

  doc.setTextColor(17, 24, 39);
  addDivider();

  // Score cards
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Score Overview', margin, y);
  y += 8;

  const scoreData = [
    { label: 'UX', value: analysis?.ux_score },
    { label: 'SEO', value: analysis?.seo_score },
    { label: 'Mobile', value: analysis?.mobile_score },
    { label: 'Performance', value: analysis?.performance_score },
    { label: 'Lead', value: analysis?.lead_score },
    { label: 'Growth', value: analysis?.growth_score },
  ];

  const cardWidth = (contentWidth - 10) / 2;
  const cardHeight = 26;

  scoreData.forEach((item, index) => {
    if (index % 2 === 0) {
      y = ensureSpace(doc, y, cardHeight + 6, margin);
      drawScoreCard(doc, {
        x: margin,
        y,
        width: cardWidth,
        height: cardHeight,
        label: `${item.label} Score`,
        score: item.value,
      });
      if (scoreData[index + 1]) {
        drawScoreCard(doc, {
          x: margin + cardWidth + 10,
          y,
          width: cardWidth,
          height: cardHeight,
          label: `${scoreData[index + 1].label} Score`,
          score: scoreData[index + 1].value,
        });
      }
      y += cardHeight + 6;
    }
  });

  y += 4;
  addDivider();

  // Key Issues
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Issues', margin, y);
  y += 8;

  const issues = (analysis?.issues ?? []).slice(0, 5);
  if (!issues.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Issues will appear after the first analysis run.', margin, y);
    y += 10;
  } else {
    issues.forEach((issue) => {
      const title = issue?.title ?? issue?.description ?? 'Untitled issue';
      const titleLines = splitText(doc, title, contentWidth - 20);
      const descriptionLines = splitText(
        doc,
        issue?.description ?? 'No additional context provided.',
        contentWidth - 20
      );
      const textHeight = titleLines.length * 6 + descriptionLines.length * 4 + 12;
      const blockHeight = Math.max(24, textHeight);
      y = ensureSpace(doc, y, blockHeight + 4, margin);

      doc.setFillColor(247, 248, 250);
      doc.rect(margin, y, contentWidth, blockHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(titleLines, margin + 6, y + 8);

      const infoStart = y + 8 + titleLines.length * 6;
      const area = (issue?.area ?? 'general').toUpperCase();
      const severity = (issue?.severity ?? 'unknown').toUpperCase();
      const severityCol = severityColor(issue?.severity);
      doc.setFillColor(severityCol.r, severityCol.g, severityCol.b);
      doc.circle(margin + 4, infoStart + 2, 2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${area} • ${severity}`, margin + 10, infoStart + 4);

      doc.setFontSize(9);
      doc.text(descriptionLines, margin + 6, infoStart + 10, {
        maxWidth: contentWidth - 12,
      });

      y += blockHeight + 4;
    });
  }

  addDivider();

  // Suggestions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Recommended Improvements', margin, y);
  y += 8;

  const suggestions = (analysis?.suggestions ?? []).slice(0, 4);
  if (!suggestions.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('No suggestions yet. Run an analysis to unlock guidance.', margin, y);
    y += 10;
  } else {
    suggestions.forEach((suggestion, index) => {
      const text = `${index + 1}. ${suggestion?.title ?? 'Improvement'} — ${
        suggestion?.rationale ?? suggestion?.description ?? 'Details unavailable.'
      }`;
      const lines = splitText(doc, text, contentWidth);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      lines.forEach((line) => {
        y = ensureSpace(doc, y, 6, margin);
        doc.text(line, margin, y);
        y += 6;
      });
      y += 2;
    });
  }

  addDivider();

  // Business Impact
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Business Impact', margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const estimatedLoss =
    analysis?.estimated_monthly_loss ?? analysis?.estimated_loss ?? null;
  const impactLines = [
    estimatedLoss
      ? `Estimated Monthly Revenue Loss: ₹${Number(estimatedLoss).toLocaleString('en-IN')}`
      : null,
    analysis?.business_impact?.summary ??
      'Optimizing UX, SEO, and growth levers can unlock meaningful revenue lift.',
  ]
    .filter(Boolean)
    .map((line) => splitText(doc, line, contentWidth));

  impactLines.forEach((block) => {
    block.forEach((line) => {
      y = ensureSpace(doc, y, 6, margin);
      doc.text(line, margin, y);
      y += 6;
    });
    y += 2;
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 124, 135);
  doc.text('Generated by ConvertX AI', pageWidth / 2, footerY, { align: 'center' });

  doc.save('convertx-report.pdf');
};
