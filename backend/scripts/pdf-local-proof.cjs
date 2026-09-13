/* Local PDF proof: renders the latest approved offer via the real pdf.service render path,
   writes the buffer to disk, checks the %PDF header, and extracts text content.
   Run from backend/: node scripts/pdf-local-proof.cjs */
const fs = require("fs");
const mongoose = require("mongoose");

(async () => {
  const { connectDB } = require("../dist/config/db");
  await connectDB();

  const { renderOfferPdf } = require("../dist/services/pdf.service");
  const { Offer } = require("../dist/modules/offers/offer.model");
  const { Candidate } = require("../dist/modules/candidates/candidate.model");

  const offer = await Offer.findOne({ status: { $in: ["approved", "awaiting_approval"] } }).sort({ createdAt: -1 });
  if (!offer) {
    console.error("NO_APPROVED_OFFER_FOUND");
    process.exit(1);
  }
  const candidate = await Candidate.findById(offer.candidateId);
  console.log("SUBJECT OFFER:", String(offer._id), "| status:", offer.status, "| candidate:", candidate?.fullName, "| CTC:", offer.salaryStructure?.annualCTC);

  const buf = await renderOfferPdf(String(offer._id));
  fs.mkdirSync("scripts/out", { recursive: true });
  const out = `scripts/out/offer_${String(offer._id)}.pdf`;
  fs.writeFileSync(out, buf);

  console.log("WROTE:", out);
  console.log("SIZE_BYTES:", buf.length);
  console.log("HEADER_ASCII:", JSON.stringify(buf.subarray(0, 8).toString("ascii")));
  console.log("IS_REAL_PDF:", buf.subarray(0, 4).toString("ascii") === "%PDF");

  try {
    const pdfParse = require("pdf-parse");
    const data = typeof pdfParse === "function" ? await pdfParse(buf) : await pdfParse.pdf(buf);
    console.log("PAGES:", data.numpages);
    console.log("--- EXTRACTED TEXT (first 900 chars) ---");
    console.log(String(data.text || "").replace(/\s+\n/g, "\n").slice(0, 900));
  } catch (e) {
    console.log("TEXT_EXTRACTION_SKIPPED:", e.message);
  }

  await mongoose.connection.close();
  process.exit(0);
})().catch((e) => {
  console.error("PROOF_FAILED:", e && e.message ? e.message : e);
  process.exit(1);
});
