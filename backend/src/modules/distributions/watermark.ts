import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export async function addWatermarkToPdf(pdfBuffer: Buffer, text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const lines = text.split('\n');
    const fontSize = 11;
    const lineHeight = fontSize + 4;
    const totalHeight = lines.length * lineHeight;
    const startY = 28 + totalHeight;

    // Footer box
    page.drawRectangle({
      x: 20,
      y: 14,
      width: width - 40,
      height: totalHeight + 14,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
      opacity: 0.9,
    });

    lines.forEach((line, i) => {
      page.drawText(line, {
        x: 30,
        y: startY - i * lineHeight,
        size: fontSize,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    });

    // Diagonal watermark (subtle)
    const watermarkLabel = lines[0];
    page.drawText(watermarkLabel, {
      x: width / 2 - 120,
      y: height / 2,
      size: 36,
      font,
      color: rgb(0.85, 0.85, 0.85),
      rotate: degrees(45),
      opacity: 0.25,
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
