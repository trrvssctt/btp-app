import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CompanySettings {
  raison_sociale: string;
  logo_url?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone?: string | null;
  email?: string | null;
  ninea?: string | null;
  registre_commerce?: string | null;
  devise?: string | null;
}

interface PurchaseOrder {
  numero: string;
  created_at: string;
  statut: string;
  supplier_nom: string;
  montant_total: number | string;
  lignes: Array<{
    article_code?: string;
    article_designation?: string;
    designation_libre?: string;
    quantite: number | string;
    prix_unitaire: number | string;
  }>;
}

interface Supplier {
  raison_sociale: string;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
}

/* Formate un nombre avec des espaces normaux (pas d'espace insécable fine U+202F,
   que la police standard de jsPDF n'affiche pas correctement). */
function fmt(n: number): string {
  return Math.round(n)
    .toLocaleString('fr-FR')
    // U+202F (espace fine insécable) et U+00A0 (insécable) -> espace normal,
    // sinon la police standard de jsPDF les rend « / ».
    .replace(/[\u202f\u00a0]/g, ' ');
}

/* Récupère une image distante (Cloudinary) et la convertit en data URL
   pour pouvoir l'intégrer dans le PDF via addImage. */
async function fetchImageAsDataURL(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generatePurchaseOrderPDF(
  purchaseOrder: PurchaseOrder,
  companySettings: CompanySettings | null,
  supplier?: Supplier | null,
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginL = 15;
  const marginR = 15;
  const devise = companySettings?.devise || 'FCFA';

  const primaryColor: [number, number, number] = [41, 128, 185];
  const secondaryColor: [number, number, number] = [52, 73, 94];
  const textColor: [number, number, number] = [44, 62, 80];

  // === LOGO (haut-droite) ===
  if (companySettings?.logo_url) {
    try {
      const dataUrl = await fetchImageAsDataURL(companySettings.logo_url);
      const props = doc.getImageProperties(dataUrl);
      const maxW = 38;
      const maxH = 22;
      const scale = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * scale;
      const h = props.height * scale;
      const fileType = (props.fileType || 'PNG').toUpperCase();
      const fmtType = fileType.includes('JPG') || fileType.includes('JPEG') ? 'JPEG' : 'PNG';
      doc.addImage(dataUrl, fmtType, pageWidth - marginR - w, 14, w, h);
    } catch {
      // Logo indisponible : on continue sans bloquer la génération
    }
  }

  let yPos = 20;

  // === EN-TÊTE ENTREPRISE (gauche) ===
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(companySettings?.raison_sociale || 'ENTREPRISE BTP', marginL, yPos);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  yPos += 7;

  const headerLines: string[] = [];
  if (companySettings?.adresse) headerLines.push(companySettings.adresse);
  const cityLine = [companySettings?.code_postal, companySettings?.ville, companySettings?.pays]
    .filter(Boolean).join(', ');
  if (cityLine) headerLines.push(cityLine);
  if (companySettings?.telephone) headerLines.push(`Tél : ${companySettings.telephone}`);
  if (companySettings?.email) headerLines.push(`Email : ${companySettings.email}`);
  if (companySettings?.ninea) headerLines.push(`NINEA : ${companySettings.ninea}`);
  if (companySettings?.registre_commerce) headerLines.push(`RC : ${companySettings.registre_commerce}`);

  headerLines.forEach((line) => {
    doc.text(line, marginL, yPos);
    yPos += 4;
  });

  // Ligne de séparation (sous le bloc le plus bas : texte ou logo)
  yPos = Math.max(yPos, 40) + 4;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(marginL, yPos, pageWidth - marginR, yPos);
  yPos += 10;

  // === TITRE ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('BON DE COMMANDE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // === INFOS BC ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text(`N° ${purchaseOrder.numero}`, marginL, yPos);
  const dateStr = new Date(purchaseOrder.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.text(`Date : ${dateStr}`, pageWidth - marginR, yPos, { align: 'right' });
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Statut : ${purchaseOrder.statut}`, marginL, yPos);
  yPos += 9;

  // === FOURNISSEUR ===
  doc.setFillColor(240, 240, 240);
  doc.rect(marginL, yPos, pageWidth - marginL - marginR, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text('FOURNISSEUR', marginL + 2, yPos + 5.5);
  yPos += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.text(supplier?.raison_sociale || purchaseOrder.supplier_nom || '—', marginL + 2, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const supLines: string[] = [];
  if (supplier?.adresse) supLines.push(supplier.adresse);
  if (supplier?.telephone) supLines.push(`Tél : ${supplier.telephone}`);
  if (supplier?.email) supLines.push(`Email : ${supplier.email}`);
  supLines.forEach((line) => {
    doc.text(line, marginL + 2, yPos);
    yPos += 4;
  });
  yPos += 6;

  // === TABLEAU DES ARTICLES ===
  const tableData = purchaseOrder.lignes.map((ligne, index) => {
    const designation = ligne.article_designation || ligne.designation_libre || '—';
    const quantite = parseFloat(String(ligne.quantite)) || 0;
    const prix = parseFloat(String(ligne.prix_unitaire)) || 0;
    return [
      String(index + 1),
      designation,
      ligne.article_code || '—',
      fmt(quantite),
      fmt(prix),
      fmt(quantite * prix),
    ];
  });

  const totalHT = parseFloat(String(purchaseOrder.montant_total)) || 0;

  autoTable(doc, {
    startY: yPos,
    head: [['N°', 'Désignation', 'Code', 'Qté', `P.U. (${devise})`, `Total (${devise})`]],
    body: tableData,
    foot: [['', 'TOTAL HT', '', '', '', `${fmt(totalHT)} ${devise}`]],
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: textColor,
      lineColor: [225, 228, 232],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [236, 240, 243],
      textColor: secondaryColor,
      fontStyle: 'bold',
      halign: 'right',
      fontSize: 10,
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 26, halign: 'left' },
      3: { cellWidth: 16, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: marginL, right: marginR },
  });

  yPos = (doc as any).lastAutoTable.finalY + 14;

  // === SIGNATURE ===
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos > pageHeight - 40) { doc.addPage(); yPos = 30; }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Signature et cachet du fournisseur :', marginL, yPos);
  yPos += 18;
  doc.setDrawColor(180, 180, 180);
  doc.line(marginL, yPos, marginL + 65, yPos);

  // === PIED DE PAGE ===
  const now = new Date().toLocaleString('fr-FR');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `${companySettings?.raison_sociale || ''} — Document généré le ${now}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' },
  );

  doc.save(`Bon_Commande_${purchaseOrder.numero}.pdf`);
}
