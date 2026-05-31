import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/format";
import {
  getPayslipAssetPath,
  PAYSLIP_HEADER_IMAGE,
  PAYSLIP_SIGN_IMAGE,
  PAYSLIP_STAMP_IMAGE,
} from "@/lib/payslip-assets";
import {
  PAYSLIP_COLORS as C,
  PAYSLIP_COPY,
  PAYSLIP_DETAIL_ROWS,
  formatNetPayLine,
  formatTotalLine,
  getDetailRowCells,
  pxToPt,
} from "@/lib/payslip-template-spec";
import type { PayslipData } from "@/lib/types";

/** react-pdf layout — pixel-matched to salary-template.html via pxToPt() */
const padH = pxToPt(90);
const padTop = pxToPt(56);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: pxToPt(12),
    color: C.navy,
    backgroundColor: C.white,
    paddingTop: padTop,
    paddingBottom: pxToPt(56),
    paddingHorizontal: padH,
    position: "relative",
  },
  header: {
    height: pxToPt(130),
    backgroundColor: C.purple,
    position: "relative",
    marginHorizontal: -padH,
    marginTop: -padTop,
    marginBottom: pxToPt(18),
  },
  headerLogo: {
    width: pxToPt(160),
    marginTop: pxToPt(25),
    marginLeft: pxToPt(45),
    objectFit: "contain",
  },
  headerYellow: {
    position: "absolute",
    right: 0,
    top: pxToPt(48),
    width: pxToPt(300),
    height: pxToPt(55),
    backgroundColor: C.yellow,
    borderTopLeftRadius: pxToPt(55),
  },
  sectionTitle: {
    fontSize: pxToPt(13),
    fontWeight: "bold",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: C.navy,
    paddingBottom: pxToPt(6),
    marginTop: pxToPt(26),
    marginBottom: pxToPt(6),
  },
  detailsTable: {
    marginTop: pxToPt(22),
  },
  detailsRow: {
    flexDirection: "row",
    width: "100%",
  },
  detailsCell: {
    width: "25%",
    paddingVertical: pxToPt(6),
    paddingHorizontal: pxToPt(8),
    fontWeight: "bold",
    fontSize: pxToPt(12),
  },
  detailsValue: {
    color: C.black,
    fontWeight: "normal",
  },
  detailsStripe: {
    backgroundColor: C.stripeDetail,
  },
  salaryTable: {
    width: "100%",
    marginTop: pxToPt(22),
    borderWidth: 1,
    borderColor: C.border,
  },
  salarySectionRow: {
    flexDirection: "row",
  },
  salarySectionCell: {
    width: "50%",
    backgroundColor: C.purple,
    color: C.white,
    fontSize: pxToPt(13),
    fontWeight: "bold",
    paddingVertical: pxToPt(8),
    paddingHorizontal: pxToPt(8),
    textAlign: "left",
  },
  salaryHeaderRow: {
    flexDirection: "row",
    backgroundColor: C.tableHead,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  salaryHeaderCell: {
    width: "25%",
    paddingVertical: pxToPt(8),
    paddingHorizontal: pxToPt(8),
    fontSize: pxToPt(12),
    fontWeight: "bold",
    color: C.navy,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  salaryHeaderAmt: {
    textAlign: "right",
  },
  salaryDataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  salaryDataStripe: {
    backgroundColor: C.stripeSalary,
  },
  salaryDataCell: {
    width: "25%",
    paddingVertical: pxToPt(7),
    paddingHorizontal: pxToPt(8),
    fontSize: pxToPt(12),
    color: C.textDark,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  salaryDataAmt: {
    textAlign: "right",
    fontWeight: "bold",
    color: C.black,
  },
  totalsBar: {
    flexDirection: "row",
    backgroundColor: C.purple,
    marginTop: pxToPt(26),
    color: C.white,
    fontWeight: "bold",
    fontSize: pxToPt(12),
  },
  totalsHalf: {
    width: "50%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: pxToPt(8),
    paddingHorizontal: pxToPt(8),
  },
  netBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: C.purple,
    color: C.white,
    paddingVertical: pxToPt(14),
    paddingHorizontal: pxToPt(10),
    marginTop: pxToPt(20),
    fontSize: pxToPt(13),
    fontWeight: "bold",
  },
  netWords: {
    fontStyle: "italic",
    flex: 1,
    paddingRight: pxToPt(8),
  },
  note: {
    marginTop: pxToPt(16),
    color: C.muted,
    fontSize: pxToPt(12),
    fontStyle: "italic",
  },
  signBlock: {
    marginTop: pxToPt(24),
    fontSize: pxToPt(12),
  },
  signTitle: {
    fontWeight: "bold",
    marginBottom: pxToPt(16),
  },
  signImages: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: pxToPt(8),
    marginBottom: pxToPt(12),
  },
  signImage: {
    width: pxToPt(100),
    height: pxToPt(100),
    objectFit: "contain",
    marginRight: pxToPt(24),
  },
  signRole: {
    fontSize: pxToPt(12),
    color: "#333333",
  },
  footer: {
    position: "absolute",
    bottom: pxToPt(38),
    left: padH,
    right: padH,
    textAlign: "center",
    fontSize: pxToPt(11),
    fontWeight: "bold",
    color: C.muted,
  },
});

function DetailsRow({
  cells,
  stripe,
}: {
  cells: [string, string, string, string];
  stripe?: boolean;
}) {
  return (
    <View style={[styles.detailsRow, stripe ? styles.detailsStripe : {}]}>
      {cells.map((text, i) => (
        <Text
          key={i}
          style={[
            styles.detailsCell,
            i === 1 || i === 3 ? styles.detailsValue : {},
          ]}
        >
          {text}
        </Text>
      ))}
    </View>
  );
}

function SalaryCombinedTable({ payslip }: { payslip: PayslipData }) {
  const rowCount = Math.max(payslip.earnings.length, payslip.deductions.length);
  return (
    <View style={styles.salaryTable}>
      <View style={styles.salarySectionRow}>
        <Text style={styles.salarySectionCell}>{PAYSLIP_COPY.earningsHeader}</Text>
        <Text style={styles.salarySectionCell}>
          {PAYSLIP_COPY.deductionsHeader}
        </Text>
      </View>
      <View style={styles.salaryHeaderRow}>
        <Text style={styles.salaryHeaderCell}>
          {PAYSLIP_COPY.descriptionHeader}
        </Text>
        <Text style={[styles.salaryHeaderCell, styles.salaryHeaderAmt]}>
          {PAYSLIP_COPY.amountHeader}
        </Text>
        <Text style={styles.salaryHeaderCell}>
          {PAYSLIP_COPY.descriptionHeader}
        </Text>
        <Text style={[styles.salaryHeaderCell, styles.salaryHeaderAmt]}>
          {PAYSLIP_COPY.amountHeader}
        </Text>
      </View>
      {Array.from({ length: rowCount }, (_, i) => (
        <View
          key={i}
          style={[
            styles.salaryDataRow,
            i % 2 === 0 ? styles.salaryDataStripe : {},
          ]}
        >
          <Text style={styles.salaryDataCell}>
            {payslip.earnings[i]?.label ?? ""}
          </Text>
          <Text style={[styles.salaryDataCell, styles.salaryDataAmt]}>
            {payslip.earnings[i]
              ? formatCurrency(payslip.earnings[i].amount)
              : ""}
          </Text>
          <Text style={styles.salaryDataCell}>
            {payslip.deductions[i]?.label ?? ""}
          </Text>
          <Text style={[styles.salaryDataCell, styles.salaryDataAmt]}>
            {payslip.deductions[i]
              ? formatCurrency(payslip.deductions[i].amount)
              : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function PayslipDocument({
  payslip,
  headerImageSrc,
  signImageSrc,
  stampImageSrc,
}: {
  payslip: PayslipData;
  headerImageSrc?: string;
  signImageSrc?: string;
  stampImageSrc?: string;
}) {
  const e = payslip.employee;
  const headerSrc =
    headerImageSrc ?? getPayslipAssetPath(PAYSLIP_HEADER_IMAGE);
  const signSrc = signImageSrc ?? getPayslipAssetPath(PAYSLIP_SIGN_IMAGE);
  const stampSrc = stampImageSrc ?? getPayslipAssetPath(PAYSLIP_STAMP_IMAGE);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={headerSrc} style={styles.headerLogo} />
          <View style={styles.headerYellow} />
        </View>

        <Text style={styles.sectionTitle}>{PAYSLIP_COPY.employeeSection}</Text>

        <View style={styles.detailsTable}>
          {PAYSLIP_DETAIL_ROWS.map((row, index) => (
            <DetailsRow
              key={row.leftLabel}
              stripe={index % 2 === 1}
              cells={getDetailRowCells(e, row)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>{PAYSLIP_COPY.salarySection}</Text>

        <SalaryCombinedTable payslip={payslip} />

        <View style={styles.totalsBar}>
          <View style={styles.totalsHalf}>
            <Text>{PAYSLIP_COPY.totalEarnings}</Text>
            <Text>{formatTotalLine(payslip.totalEarnings)}</Text>
          </View>
          <View style={styles.totalsHalf}>
            <Text>{PAYSLIP_COPY.totalDeductions}</Text>
            <Text>{formatTotalLine(payslip.totalDeductions)}</Text>
          </View>
        </View>

        <View style={styles.netBar}>
          <Text style={styles.netWords}>
            {PAYSLIP_COPY.netPayPrefix} {payslip.netPayInWords}
          </Text>
          <Text>
            {PAYSLIP_COPY.netPayLabel}
            {formatNetPayLine(payslip.netPay)}
          </Text>
        </View>

        <Text style={styles.note}>{PAYSLIP_COPY.systemNote}</Text>

        <View style={styles.signBlock}>
          <Text style={styles.signTitle}>{PAYSLIP_COPY.signatoryTitle}</Text>
          <View style={styles.signImages}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={signSrc} style={styles.signImage} />
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={stampSrc} style={styles.signImage} />
          </View>
          <Text style={styles.signRole}>{PAYSLIP_COPY.signatoryRole}</Text>
        </View>

        <Text style={styles.footer} fixed>
          {PAYSLIP_COPY.footer}
        </Text>
      </Page>
    </Document>
  );
}
